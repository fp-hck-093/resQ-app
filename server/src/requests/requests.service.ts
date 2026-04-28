import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { Request } from './models/request.model';
import { VolunteerInfo } from './dto/volunteer-info.output';
import { CreateRequestInput } from './dto/create-request.input';
import { GetRequestsFilterInput } from './dto/get-requests-filter.input';
import { NEARBY_REQUESTS_RADIUS_KM } from '../common/constants/radius.constants';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityLogStatus } from '../activity-logs/models/activity-log.model';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/models/user.model';
import { DangerZone } from '../danger-zones/models/danger-zone.model';
import { EarthquakeAlert } from '../bmkg-logs/models/earthquake-alert.model';
import { BmkgAlert } from '../bmkg-logs/models/bmkg-alert.model';

const GEMINI_URGENCY_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request) private requestModel: typeof Request,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(DangerZone) private dangerZoneModel: typeof DangerZone,
    @InjectModel(EarthquakeAlert)
    private earthquakeModel: typeof EarthquakeAlert,
    @InjectModel(BmkgAlert) private bmkgAlertModel: typeof BmkgAlert,
    private activityLogsService: ActivityLogsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  private async attachVolunteers(requests: Request[]): Promise<Request[]> {
    const allIds = requests.flatMap(
      (r) => (r.volunteerIds as unknown as ObjectId[]) ?? [],
    );

    if (allIds.length === 0) return requests;

    const users = await this.userModel.where('_id', { $in: allIds }).get();

    const userMap = new Map(
      (users as unknown as User[]).map((u) => [
        u._id.toString(),
        { _id: u._id.toString(), name: u.name },
      ]),
    );

    for (const r of requests) {
      const ids = (r.volunteerIds as unknown as ObjectId[]) ?? [];
      r.volunteers = ids
        .map((id) => userMap.get(id.toString()))
        .filter((v): v is VolunteerInfo => v !== undefined);
    }

    return requests;
  }

  // ─── Urgency Scoring ─────────────────────────────────────────────────────────

  private async scoreUrgency(input: CreateRequestInput): Promise<number> {
    const [lon, lat] = input.location.coordinates;
    const now = new Date().toISOString();

    const allZones = await this.dangerZoneModel.where('isActive', true).get();
    const nearbyZones = (allZones as unknown as DangerZone[]).filter((z) => {
      const [zLon, zLat] = (z.location as unknown as { coordinates: number[] })
        .coordinates;
      return haversineKm(lat, lon, zLat, zLon) <= z.radiusKm;
    });

    const cutoff = new Date(Date.now() - 24 * 3_600_000);
    const allQuakes = await this.earthquakeModel
      .where('magnitude', { $gte: 5 })
      .where('fetchedAt', { $gte: cutoff })
      .get();
    const nearbyQuakes = (allQuakes as unknown as EarthquakeAlert[]).filter(
      (e) => {
        const [eLon, eLat] = (
          e.location as unknown as { coordinates: number[] }
        ).coordinates;
        return haversineKm(lat, lon, eLat, eLon) <= 200;
      },
    );

    const allBmkg = await this.bmkgAlertModel.where('isDangerous', true).get();
    const nearbyBmkg = (allBmkg as unknown as BmkgAlert[]).filter((a) => {
      if (a.expires && a.expires < now) return false;
      const coords = (a.location as unknown as { coordinates: number[][][][] })
        .coordinates;
      return coords.some((polygon) => {
        const ring = polygon[0];
        const cLon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
        const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        return haversineKm(lat, lon, cLat, cLon) <= 100;
      });
    });

    const locationLines = [
      nearbyZones.length > 0
        ? `Active danger zones: ${nearbyZones.map((z) => `${z.title} (${z.level})`).join(', ')}`
        : 'No active danger zones at this location',
      nearbyQuakes.length > 0
        ? `Recent earthquakes: ${nearbyQuakes.map((e) => `M${e.magnitude} near ${e.wilayah}`).join(', ')}`
        : 'No recent significant earthquakes nearby',
      nearbyBmkg.length > 0
        ? `Active weather alerts: ${nearbyBmkg.map((a) => `${a.event} (${a.severity})`).join(', ')}`
        : 'No active weather alerts nearby',
    ].join('\n');

    const requestLines = [
      `Category: ${input.category}`,
      `Description: "${input.description}"`,
      `Number of people affected: ${input.numberOfPeople}`,
      `Address: ${input.address}`,
    ].join('\n');

    const prompt =
      `You are a disaster response urgency analyst for Indonesia.\n` +
      `Score the urgency of the following rescue request from 1 to 10` +
      ` (10 = most critical, requiring immediate response).\n\n` +
      `Location context (highest priority factor):\n${locationLines}\n\n` +
      `Request details:\n${requestLines}\n\n` +
      `Return a JSON object:\n` +
      `{ "score": number (1-10), "rationale": "one sentence" }`;

    type Part =
      | { text: string }
      | { inlineData: { mimeType: string; data: string } };
    const parts: Part[] = [{ text: prompt }];

    if (input.photos && input.photos.length > 0) {
      try {
        const imgRes = await fetch(input.photos[0]);
        const buffer = await imgRes.arrayBuffer();
        parts.push({
          inlineData: {
            mimeType: imgRes.headers.get('content-type') ?? 'image/jpeg',
            data: Buffer.from(buffer).toString('base64'),
          },
        });
        parts.push({
          text: 'The image above shows the current situation at the scene.',
        });
      } catch {
        // photo unavailable — score on text context only
      }
    }

    try {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
      const res = await fetch(`${GEMINI_URGENCY_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          candidates: { content: { parts: { text: string }[] } }[];
        };
        const text = data.candidates[0]?.content?.parts[0]?.text ?? '{}';
        const result = JSON.parse(text) as { score: number };
        const score = Math.round(result.score);
        if (score >= 1 && score <= 10) return score;
      }
    } catch {
      // fall through to rule-based
    }

    return this.ruleBasedScore(input, nearbyZones);
  }

  private ruleBasedScore(
    input: CreateRequestInput,
    dangerZones: DangerZone[],
  ): number {
    const categoryBase: Record<string, number> = {
      Rescue: 8,
      Medical: 7,
      Shelter: 5,
      Food: 4,
      'Money/Item': 2,
    };
    let score = categoryBase[input.category] ?? 5;

    if (input.numberOfPeople >= 10) score += 1;
    else if (input.numberOfPeople >= 5) score += 0.5;

    const levelWeight: Record<string, number> = {
      extreme: 2,
      high: 1,
      moderate: 0.5,
    };
    const maxBonus = dangerZones.reduce(
      (max, z) => Math.max(max, levelWeight[z.level] ?? 0),
      0,
    );
    score += maxBonus;

    return Math.min(10, Math.max(1, Math.round(score)));
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────────

  async createRequest(input: CreateRequestInput): Promise<Request> {
    const validCategories = [
      'Rescue',
      'Shelter',
      'Food',
      'Medical',
      'Money/Item',
    ];
    if (!validCategories.includes(input.category)) {
      throw new BadRequestException(
        `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      );
    }

    const urgencyScore = await this.scoreUrgency(input);

    const result = await this.requestModel.create({
      userId: new ObjectId(input.userId),
      userName: input.userName,
      userPhone: input.userPhone,
      category: input.category,
      description: input.description,
      numberOfPeople: input.numberOfPeople,
      urgencyScore,
      location: input.location,
      address: input.address,
      photos: input.photos || [],
      status: 'pending',
    });

    return result as unknown as Request;
  }

  async getRequests(filter?: GetRequestsFilterInput): Promise<Request[]> {
    const { search, category, status, sortBy, sortOrder, latitude, longitude } =
      filter ?? {};
    const order = (sortOrder ?? 'desc') as 'asc' | 'desc';
    const hasLocation = latitude !== undefined && longitude !== undefined;

    if (hasLocation) {
      let query = this.requestModel.where('location', {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: NEARBY_REQUESTS_RADIUS_KM * 1000,
        },
      });
      if (search)
        query = query.where('userName', { $regex: search, $options: 'i' });
      if (category) query = query.where('category', category);
      if (status) query = query.where('status', status);

      let results = (await query.get()) as unknown as Request[];
      if (sortBy) {
        results = results.sort((a, b) => {
          const aVal = a[sortBy as keyof Request] as number | string;
          const bVal = b[sortBy as keyof Request] as number | string;
          return order === 'asc'
            ? aVal > bVal
              ? 1
              : -1
            : aVal < bVal
              ? 1
              : -1;
        });
      }
      return this.attachVolunteers(results);
    }

    const hasFilters = !!(search || category || status);

    if (!hasFilters) {
      const results = await this.requestModel
        .orderBy(sortBy ?? 'createdAt', order)
        .get();
      return results as unknown as Request[];
    }

    const firstFilter = search
      ? this.requestModel.where('userName', { $regex: search, $options: 'i' })
      : category
        ? this.requestModel.where('category', category)
        : this.requestModel.where('status', status!);

    let query = firstFilter;
    if (search && category) query = query.where('category', category);
    if (search && status) query = query.where('status', status);
    if (!search && category && status) query = query.where('status', status);

    const results = await query.orderBy(sortBy ?? 'createdAt', order).get();
    return this.attachVolunteers(results as unknown as Request[]);
  }

  async getRequestsByStatus(status: string): Promise<Request[]> {
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    const results = await this.requestModel
      .where('status', status)
      .orderBy('createdAt', 'desc')
      .get();
    return results as unknown as Request[];
  }

  async getRequestsByUserId(userId: string): Promise<Request[]> {
    const results = await this.requestModel
      .where('userId', new ObjectId(userId))
      .orderBy('createdAt', 'desc')
      .get();
    return this.attachVolunteers(results as unknown as Request[]);
  }

  async getRequestById(id: string): Promise<Request> {
    const result = await this.requestModel.find(id);
    if (!result) {
      throw new NotFoundException('Request not found');
    }
    const [withVolunteers] = await this.attachVolunteers([result]);
    return withVolunteers;
  }

  async deleteRequest(id: string, userId: string): Promise<string> {
    const request = await this.requestModel.find(id);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId.toString() !== userId) {
      throw new BadRequestException('You can only delete your own requests');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be deleted');
    }

    await this.requestModel.destroy(id);
    return 'Request has been deleted';
  }

  async volunteerForRequest(
    requestId: string,
    userId: string,
    volunteerId: string,
  ): Promise<Request> {
    const request = await this.requestModel.find(requestId);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId.toString() === userId) {
      throw new BadRequestException(
        'You cannot volunteer for your own request',
      );
    }

    if (request.status === 'completed') {
      throw new BadRequestException('Cannot volunteer for a completed request');
    }

    const currentIds: ObjectId[] =
      (request.volunteerIds as unknown as ObjectId[]) ?? [];

    if (currentIds.map((id) => id.toString()).includes(volunteerId)) {
      throw new BadRequestException(
        'You have already volunteered for this request',
      );
    }

    const updatedIds = [...currentIds, new ObjectId(volunteerId)];

    if (request.status === 'pending') {
      await request
        .fill({ status: 'in_progress', volunteerIds: updatedIds })
        .save();
    } else {
      await request.fill({ volunteerIds: updatedIds }).save();
    }

    await this.activityLogsService.create(volunteerId, requestId);

    // Notify request owner
    const owner = await this.usersService.findById(request.userId.toString());
    const ownerTokens = (owner?.pushTokens as unknown as string[]) ?? [];
    if (ownerTokens.length > 0) {
      void this.notificationsService.sendToMany(
        ownerTokens,
        'Ada yang ingin membantu!',
        `Seseorang telah menerima request ${request.category} kamu.`,
        { requestId },
      );
    }

    return request;
    const [withVolunteers] = await this.attachVolunteers([request]);
    return withVolunteers;
  }

  async updateRequestStatus(id: string, userId: string): Promise<Request> {
    const request = await this.requestModel.find(id);
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.userId.toString() !== userId) {
      throw new BadRequestException('You can only complete your own requests');
    }

    if (request.status !== 'in_progress') {
      throw new BadRequestException(
        'Only in-progress requests can be marked as completed',
      );
    }

    await request.fill({ status: 'completed' }).save();

    await this.activityLogsService.updateStatusByRequest(
      id,
      ActivityLogStatus.COMPLETED,
    );

    // Notify all volunteers
    const volunteerIds = (
      (request.volunteerIds as unknown as string[]) ?? []
    ).map(String);

    const volunteers = await Promise.all(
      volunteerIds.map((vid) => this.usersService.findById(vid)),
    );
    const tokens = volunteers
      .flatMap((v) => (v?.pushTokens as unknown as string[]) ?? [])
      .filter((t): t is string => !!t);

    if (tokens.length > 0) {
      void this.notificationsService.sendToMany(
        tokens,
        'Request selesai!',
        `Request ${request.category} dari ${request.userName} telah diselesaikan.`,
        { requestId: id },
      );
    }

    return request;
    const [withVolunteers] = await this.attachVolunteers([request]);
    return withVolunteers;
  }
}
