import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ObjectId } from 'mongodb';
import { Request } from './models/request.model';
import { VolunteerInfo } from './dto/volunteer-info.output';
import { CreateRequestInput } from './dto/create-request.input';
import { GetRequestsFilterInput } from './dto/get-requests-filter.input';
import { NEARBY_REQUESTS_RADIUS_KM } from '../common/constants/radius.constants';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ActivityLogStatus } from '../activity-logs/models/activity-log.model';
import { User } from '../users/models/user.model';

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(Request) private requestModel: typeof Request,
    @InjectModel(User) private userModel: typeof User,
    private activityLogsService: ActivityLogsService,
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

    const result = await this.requestModel.create({
      userId: new ObjectId(input.userId),
      userName: input.userName,
      userPhone: input.userPhone,
      category: input.category,
      description: input.description,
      numberOfPeople: input.numberOfPeople,
      urgencyScore: input.urgencyScore,
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

    const [withVolunteers] = await this.attachVolunteers([request]);
    return withVolunteers;
  }
}
