import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import {
  EarthquakeAlert,
  IEarthquakeAlert,
} from './models/earthquake-alert.model';

const EARTHQUAKE_URL = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface BmkgGempa {
  Tanggal: string;
  Jam: string;
  Coordinates: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
}

@Injectable()
export class BmkgLogsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BmkgLogsService.name);
  private pollingTimer: NodeJS.Timeout;

  constructor(
    @InjectModel(EarthquakeAlert)
    private earthquakeModel: typeof EarthquakeAlert,
  ) {}

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  onModuleInit() {
    void this.pollEarthquake();
    this.pollingTimer = setInterval(
      () => void this.pollEarthquake(),
      POLL_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    clearInterval(this.pollingTimer);
  }

  private async pollEarthquake() {
    try {
      const result = await this.syncEarthquakeAlert();
      this.logger.log(
        `[Earthquake] synced — ${result.tanggal} ${result.jam} M${result.magnitude}`,
      );
    } catch (err) {
      this.logger.error('[Earthquake] sync failed', err);
    }
  }

  // ─── Core ────────────────────────────────────────────────────────────────────

  async syncEarthquakeAlert(): Promise<EarthquakeAlert> {
    const body = await this.fetchText(EARTHQUAKE_URL);
    const json = JSON.parse(body) as { Infogempa: { gempa: BmkgGempa } };
    const gempa = json.Infogempa.gempa;

    const tanggal = gempa.Tanggal;
    const jam = gempa.Jam;

    // Check if this exact event is already stored
    const existing = await this.earthquakeModel
      .where('tanggal', tanggal)
      .where('jam', jam)
      .get();

    if (existing.length > 0) return existing[0] as unknown as EarthquakeAlert;

    // Coordinates from BMKG: "lat,lon" (e.g. "-5.44,103.59")
    const [lat, lon] = gempa.Coordinates.split(',').map(Number);

    const payload: Omit<IEarthquakeAlert, '_id' | 'createdAt' | 'updatedAt'> = {
      tanggal,
      jam,
      location: { type: 'Point', coordinates: [lon, lat] },
      magnitude: parseFloat(gempa.Magnitude),
      kedalaman: gempa.Kedalaman,
      wilayah: gempa.Wilayah,
      fetchedAt: new Date(),
    };

    const result = await this.earthquakeModel.create(payload);
    return result as unknown as EarthquakeAlert;
  }

  async getEarthquakeAlerts(limit: number): Promise<EarthquakeAlert[]> {
    const results = await this.earthquakeModel
      .orderBy('fetchedAt', 'desc')
      .limit(limit)
      .get();
    return results as unknown as EarthquakeAlert[];
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'resQ-app/1.0' },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new InternalServerErrorException(
          `BMKG request failed: ${url} (${res.status})`,
        );
      }
      return await res.text();
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Network error fetching ${url}: ${msg}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
