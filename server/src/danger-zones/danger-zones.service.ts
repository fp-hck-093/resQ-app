import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongodb';
import { DangerZone, IDangerZone } from './models/danger-zone.model';
import { EarthquakeAlert } from '../bmkg-logs/models/earthquake-alert.model';
import { BmkgAlert } from '../bmkg-logs/models/bmkg-alert.model';
import { WeatherLog } from '../weather/models/weather-log.model';
import { Request } from '../requests/models/request.model';

// eslint-disable-next-line max-len
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const POLL_INTERVAL_MS = 30 * 60 * 1000;
const NEARBY_KM = 100;
const REQUEST_DENSITY_RADIUS_KM = 20;

interface GeminiResult {
  title: string;
  description: string;
  level: string;
  radiusKm: number;
  activeUntilHours: number;
}

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

function centroidsFromMultiPolygon(coords: number[][][][]): [number, number][] {
  return coords.map((polygon) => {
    const ring = polygon[0]; // outer ring only, ignore holes
    if (ring.length === 0) return [0, 0] as [number, number];
    let sumLon = 0;
    let sumLat = 0;
    for (const point of ring) {
      sumLon += point[0];
      sumLat += point[1];
    }
    return [sumLon / ring.length, sumLat / ring.length] as [number, number];
  });
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

@Injectable()
export class DangerZonesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DangerZonesService.name);
  private pollingTimer: NodeJS.Timeout;

  constructor(
    @InjectModel(DangerZone)
    private dangerZoneModel: typeof DangerZone,
    @InjectModel(EarthquakeAlert)
    private earthquakeModel: typeof EarthquakeAlert,
    @InjectModel(BmkgAlert)
    private bmkgAlertModel: typeof BmkgAlert,
    @InjectModel(WeatherLog)
    private weatherLogModel: typeof WeatherLog,
    @InjectModel(Request)
    private requestModel: typeof Request,
    private configService: ConfigService,
  ) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  onModuleInit() {
    void this.pollDangerZones();
    this.pollingTimer = setInterval(
      () => void this.pollDangerZones(),
      POLL_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    clearInterval(this.pollingTimer);
  }

  // ─── Polling ─────────────────────────────────────────────────────────────────

  async pollDangerZones(): Promise<void> {
    await this.deactivateExpired();

    const cutoff = new Date(Date.now() - 24 * 3_600_000);
    const earthquakes = await this.earthquakeModel
      .where('fetchedAt', { $gte: cutoff })
      .get();

    for (const eq of earthquakes as unknown as EarthquakeAlert[]) {
      try {
        await this.generateFromEarthquake(eq);
      } catch (err) {
        this.logger.error('[DangerZones] earthquake processing failed', err);
      }
    }

    const now = new Date().toISOString();
    const bmkgAlerts = await this.bmkgAlertModel
      .where('isDangerous', true)
      .get();

    for (const alert of bmkgAlerts as unknown as BmkgAlert[]) {
      if (alert.expires && alert.expires < now) continue;
      try {
        await this.generateFromBmkgAlert(alert);
      } catch (err) {
        this.logger.error('[DangerZones] BMKG alert processing failed', err);
      }
    }
  }

  // ─── Generators ──────────────────────────────────────────────────────────────

  async generateFromEarthquake(
    eq: EarthquakeAlert,
  ): Promise<DangerZone | null> {
    if (eq.magnitude < 5.0) return null;

    const eqId = eq._id.toString();
    if (await this.alreadyHasZone(eqId)) return null;

    const [lon, lat] = (eq.location as unknown as { coordinates: number[] })
      .coordinates;

    const nearbyBmkg = await this.findNearbyBmkgAlerts(lon, lat);
    const nearbyWeather = await this.findNearbyDangerousWeather(lon, lat);
    const requestCount = await this.countNearbyRequests(lon, lat);

    const sourceIds: ObjectId[] = [new ObjectId(eqId)];
    const sourceTypes = ['earthquake'];

    let zone: GeminiResult;

    if (nearbyBmkg.length > 0 || nearbyWeather.length > 0) {
      const signals = [
        `[earthquake] M${eq.magnitude}, depth ${eq.kedalaman},` +
          ` area: ${eq.wilayah}, time: ${eq.tanggal} ${eq.jam}`,
        ...nearbyBmkg.map(
          (a) =>
            `[bmkg_alert] ${a.event}, severity: ${a.severity},` +
            ` area: ${a.areaDesc}`,
        ),
        ...nearbyWeather.map(
          (w) =>
            `[weather] ${w.condition}, wind: ${w.windKph}kph,` +
            ` precip: ${w.precipMm}mm, city: ${w.city}`,
        ),
        ...(requestCount > 0
          ? [`[requests] ${requestCount} active rescue request(s) nearby`]
          : []),
      ];

      try {
        zone = await this.callGemini(signals);
        nearbyBmkg.forEach((a) => {
          sourceIds.push(new ObjectId(a._id.toString()));
          sourceTypes.push('bmkg_alert');
        });
        nearbyWeather.forEach((w) => {
          sourceIds.push(new ObjectId(w._id.toString()));
          sourceTypes.push('weather');
        });
      } catch {
        zone = this.ruleBasedEarthquakeZone(eq.magnitude);
      }
    } else {
      zone = this.ruleBasedEarthquakeZone(eq.magnitude);
    }

    const payload: Omit<IDangerZone, '_id' | 'createdAt' | 'updatedAt'> = {
      title: zone.title,
      description: zone.description,
      level: zone.level,
      sourceTypes,
      sourceIds,
      location: { type: 'Point', coordinates: [lon, lat] },
      radiusKm: zone.radiusKm,
      activeFrom: new Date().toISOString(),
      activeUntil: hoursFromNow(zone.activeUntilHours),
      isActive: true,
      requestCount,
    };

    const result = await this.dangerZoneModel.create(payload);
    this.logger.log(
      `[DangerZones] created zone "${zone.title}" from earthquake`,
    );
    return result as unknown as DangerZone;
  }

  async generateFromBmkgAlert(alert: BmkgAlert): Promise<DangerZone | null> {
    const alertId = alert._id.toString();
    if (await this.alreadyHasZone(alertId)) return null;

    const multiPolyCoords = (
      alert.location as unknown as { coordinates: number[][][][] }
    ).coordinates;
    const centroids = centroidsFromMultiPolygon(multiPolyCoords);
    if (centroids.length === 0) return null;

    // Use first centroid as representative for compound signal lookup
    const [refLon, refLat] = centroids[0];
    const nearbyEq = await this.findNearbyEarthquakes(refLon, refLat);
    const nearbyWeather = await this.findNearbyDangerousWeather(refLon, refLat);
    const requestCount = await this.countNearbyRequests(refLon, refLat);

    const sourceIds: ObjectId[] = [new ObjectId(alertId)];
    const sourceTypes = ['bmkg_alert'];

    let zone: GeminiResult;

    if (nearbyEq.length > 0 || nearbyWeather.length > 0) {
      const signals = [
        `[bmkg_alert] ${alert.event}, severity: ${alert.severity},` +
          ` urgency: ${alert.urgency}, area: ${alert.areaDesc}`,
        ...nearbyEq.map(
          (e) =>
            `[earthquake] M${e.magnitude}, area: ${e.wilayah},` +
            ` time: ${e.tanggal} ${e.jam}`,
        ),
        ...nearbyWeather.map(
          (w) =>
            `[weather] ${w.condition}, wind: ${w.windKph}kph,` +
            ` precip: ${w.precipMm}mm`,
        ),
        ...(requestCount > 0
          ? [`[requests] ${requestCount} active rescue request(s) nearby`]
          : []),
      ];

      try {
        zone = await this.callGemini(signals);
        nearbyEq.forEach((e) => {
          sourceIds.push(new ObjectId(e._id.toString()));
          sourceTypes.push('earthquake');
        });
        nearbyWeather.forEach((w) => {
          sourceIds.push(new ObjectId(w._id.toString()));
          sourceTypes.push('weather');
        });
      } catch {
        zone = this.ruleBasedBmkgZone(alert.severity);
      }
    } else {
      zone = this.ruleBasedBmkgZone(alert.severity);
    }

    const activeUntil = alert.expires || hoursFromNow(zone.activeUntilHours);
    let firstCreated: DangerZone | null = null;

    // One zone per polygon centroid — same AI result, precise locations
    for (const [lon, lat] of centroids) {
      const payload: Omit<IDangerZone, '_id' | 'createdAt' | 'updatedAt'> = {
        title: zone.title,
        description: zone.description,
        level: zone.level,
        sourceTypes,
        sourceIds,
        location: { type: 'Point', coordinates: [lon, lat] },
        radiusKm: zone.radiusKm,
        activeFrom: new Date().toISOString(),
        activeUntil,
        isActive: true,
        requestCount,
      };
      const result = await this.dangerZoneModel.create(payload);
      if (!firstCreated) firstCreated = result as unknown as DangerZone;
    }

    this.logger.log(
      `[DangerZones] created ${centroids.length} zone(s)` +
        ` "${zone.title}" from BMKG alert`,
    );
    return firstCreated;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async getActiveDangerZones(): Promise<DangerZone[]> {
    await this.deactivateExpired();
    const results = await this.dangerZoneModel
      .where('isActive', true)
      .orderBy('createdAt', 'desc')
      .get();
    return results as unknown as DangerZone[];
  }

  async getDangerZonesNear(
    lat: number,
    lon: number,
    radiusKm: number = NEARBY_KM,
  ): Promise<DangerZone[]> {
    const zones = await this.dangerZoneModel.where('isActive', true).get();
    const now = new Date().toISOString();
    return (zones as unknown as DangerZone[]).filter((z) => {
      if (z.activeUntil && z.activeUntil < now) return false;
      const [zLon, zLat] = (z.location as unknown as { coordinates: number[] })
        .coordinates;
      return (
        haversineKm(lat, lon, zLat, zLon) <= Math.max(radiusKm, z.radiusKm)
      );
    });
  }

  async triggerAnalysis(): Promise<string> {
    await this.pollDangerZones();
    return 'Danger zone analysis completed';
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async deactivateExpired(): Promise<void> {
    const now = new Date().toISOString();
    const zones = await this.dangerZoneModel.where('isActive', true).get();
    for (const zone of zones as unknown as DangerZone[]) {
      if (zone.activeUntil && zone.activeUntil < now) {
        const z = await this.dangerZoneModel.find(zone._id.toString());
        if (z) await z.fill({ isActive: false }).save();
      }
    }
  }

  private async alreadyHasZone(sourceId: string): Promise<boolean> {
    const zones = await this.dangerZoneModel.where('isActive', true).get();
    return (zones as unknown as DangerZone[]).some((z) =>
      ((z.sourceIds as unknown as ObjectId[]) ?? [])
        .map((id) => id.toString())
        .includes(sourceId),
    );
  }

  private async findNearbyEarthquakes(
    lon: number,
    lat: number,
  ): Promise<EarthquakeAlert[]> {
    const cutoff = new Date(Date.now() - 48 * 3_600_000);
    const all = await this.earthquakeModel
      .where('magnitude', { $gte: 5 })
      .where('fetchedAt', { $gte: cutoff })
      .get();
    return (all as unknown as EarthquakeAlert[]).filter((e) => {
      const [eLon, eLat] = (e.location as unknown as { coordinates: number[] })
        .coordinates;
      return haversineKm(lat, lon, eLat, eLon) <= NEARBY_KM;
    });
  }

  private async findNearbyBmkgAlerts(
    lon: number,
    lat: number,
  ): Promise<BmkgAlert[]> {
    const now = new Date().toISOString();
    const all = await this.bmkgAlertModel.where('isDangerous', true).get();
    return (all as unknown as BmkgAlert[]).filter((a) => {
      if (a.expires && a.expires < now) return false;
      const coords = (a.location as unknown as { coordinates: number[][][][] })
        .coordinates;
      const centroids = centroidsFromMultiPolygon(coords);
      return centroids.some(
        ([cLon, cLat]) => haversineKm(lat, lon, cLat, cLon) <= NEARBY_KM,
      );
    });
  }

  private async findNearbyDangerousWeather(
    lon: number,
    lat: number,
  ): Promise<WeatherLog[]> {
    const cutoff = new Date(Date.now() - 6 * 3_600_000);
    const all = await this.weatherLogModel
      .where('isDangerous', true)
      .where('fetchedAt', { $gte: cutoff })
      .get();
    return (all as unknown as WeatherLog[]).filter((w) => {
      const [wLon, wLat] = (w.location as unknown as { coordinates: number[] })
        .coordinates;
      return haversineKm(lat, lon, wLat, wLon) <= NEARBY_KM;
    });
  }

  private async countNearbyRequests(lon: number, lat: number): Promise<number> {
    try {
      const results = await this.requestModel
        .where('location', {
          $near: {
            $geometry: { type: 'Point', coordinates: [lon, lat] },
            $maxDistance: REQUEST_DENSITY_RADIUS_KM * 1000,
          },
        })
        .get();
      return (results as unknown as { status: string }[]).filter(
        (r) => r.status !== 'completed',
      ).length;
    } catch {
      return 0;
    }
  }

  private async callGemini(signals: string[]): Promise<GeminiResult> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    const prompt =
      `You are a disaster risk analyst for Indonesia.\n` +
      `Analyze the following hazard signals and generate a danger zone` +
      ` assessment.\n\nSignals:\n${signals.join('\n')}\n\n` +
      `Return a JSON object with these exact fields:\n` +
      `{\n` +
      `  "title": "brief danger zone title (max 60 chars)",\n` +
      `  "description": "1-2 sentences about the compound risk",\n` +
      `  "level": "low" or "moderate" or "high" or "extreme",\n` +
      `  "radiusKm": affected radius in km (5 to 100),\n` +
      `  "activeUntilHours": active duration in hours (1 to 72)\n` +
      `}`;

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API returned ${res.status}`);
    }

    const data = (await res.json()) as {
      candidates: {
        content: { parts: { text: string }[] };
      }[];
    };
    const text = data.candidates[0]?.content?.parts[0]?.text ?? '{}';
    return JSON.parse(text) as GeminiResult;
  }

  private ruleBasedEarthquakeZone(magnitude: number): GeminiResult {
    if (magnitude >= 8.0) {
      return {
        title: `Catastrophic Earthquake M${magnitude.toFixed(1)}`,
        description:
          `A catastrophic M${magnitude.toFixed(1)} earthquake has been` +
          ` detected. Widespread destruction expected across most of` +
          ` the region — all nearby populations are at risk.`,
        level: 'extreme',
        radiusKm: 1000,
        activeUntilHours: 72,
      };
    }
    if (magnitude >= 7.5) {
      return {
        title: `Great Earthquake M${magnitude.toFixed(1)}`,
        description:
          `A great M${magnitude.toFixed(1)} earthquake has been detected.` +
          ` Serious damage expected across entire provinces.`,
        level: 'extreme',
        radiusKm: 800,
        activeUntilHours: 72,
      };
    }
    if (magnitude >= 7.0) {
      return {
        title: `Major Earthquake M${magnitude.toFixed(1)}`,
        description:
          `A major M${magnitude.toFixed(1)} earthquake has been detected.` +
          ` Significant structural damage and aftershocks are expected.`,
        level: 'extreme',
        radiusKm: 600,
        activeUntilHours: 48,
      };
    }
    if (magnitude >= 6.5) {
      return {
        title: `Strong Earthquake M${magnitude.toFixed(1)}`,
        description:
          `A strong M${magnitude.toFixed(1)} earthquake has been detected.` +
          ` Heavy damage expected across a wide area.`,
        level: 'high',
        radiusKm: 400,
        activeUntilHours: 24,
      };
    }
    if (magnitude >= 6.0) {
      return {
        title: `Strong Earthquake M${magnitude.toFixed(1)}`,
        description:
          `A strong M${magnitude.toFixed(1)} earthquake has been detected.` +
          ` Structural damage is possible across the affected area.`,
        level: 'high',
        radiusKm: 300,
        activeUntilHours: 24,
      };
    }
    if (magnitude >= 5.5) {
      return {
        title: `Moderate Earthquake M${magnitude.toFixed(1)}`,
        description:
          `A moderate M${magnitude.toFixed(1)} earthquake has been detected.` +
          ` Clear shaking felt widely, light damage possible.`,
        level: 'moderate',
        radiusKm: 200,
        activeUntilHours: 12,
      };
    }
    return {
      title: `Moderate Earthquake M${magnitude.toFixed(1)}`,
      description:
        `A moderate M${magnitude.toFixed(1)} earthquake has been detected.` +
        ` Significant shaking felt, damage possible in weak structures.`,
      level: 'moderate',
      radiusKm: 150,
      activeUntilHours: 12,
    };
  }

  private ruleBasedBmkgZone(severity: string): GeminiResult {
    if (severity === 'Extreme') {
      return {
        title: 'Extreme Weather Alert',
        description:
          'An extreme weather alert is active in this area.' +
          ' Avoid all outdoor activities.',
        level: 'extreme',
        radiusKm: 30,
        activeUntilHours: 6,
      };
    }
    if (severity === 'Severe') {
      return {
        title: 'Severe Weather Alert',
        description:
          'Severe weather conditions are expected.' +
          ' Take precautions and stay indoors.',
        level: 'high',
        radiusKm: 20,
        activeUntilHours: 6,
      };
    }
    return {
      title: 'Moderate Weather Alert',
      description:
        'Moderate weather hazards are active in this area.' +
        ' Exercise caution.',
      level: 'moderate',
      radiusKm: 15,
      activeUntilHours: 6,
    };
  }
}
