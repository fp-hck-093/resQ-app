import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ConfigService } from '@nestjs/config';
import { WeatherLog } from './models/weather-log.model';

const DANGEROUS_PRECIP_MM = 20;
const DANGEROUS_WIND_KPH = 60;
const DANGEROUS_VISIBILITY_KM = 2;
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const STALE_AFTER_MS = 2 * 60 * 60 * 1000; // purge records older than 2 hours

interface CityEntry {
  lat: number;
  lon: number;
  province: string;
  name: string;
}

// All 38 Indonesian province capitals (Sumatra → Java → Bali/NT → Kalimantan → Sulawesi → Maluku → Papua)
const MAJOR_CITIES: CityEntry[] = [
  { lat: 5.5483, lon: 95.3238, province: 'Aceh', name: 'Banda Aceh' },
  { lat: 3.5952, lon: 98.6722, province: 'Sumatera Utara', name: 'Medan' },
  { lat: -0.9493, lon: 100.3543, province: 'Sumatera Barat', name: 'Padang' },
  { lat: 0.5103, lon: 101.4478, province: 'Riau', name: 'Pekanbaru' },
  { lat: 0.9186, lon: 104.4557, province: 'Kepulauan Riau', name: 'Tanjung Pinang' },
  { lat: -1.6101, lon: 103.6131, province: 'Jambi', name: 'Jambi' },
  { lat: -3.7928, lon: 102.2601, province: 'Bengkulu', name: 'Bengkulu' },
  { lat: -2.9761, lon: 104.7754, province: 'Sumatera Selatan', name: 'Palembang' },
  { lat: -2.1316, lon: 106.1165, province: 'Kepulauan Bangka Belitung', name: 'Pangkal Pinang' },
  { lat: -5.4292, lon: 105.2608, province: 'Lampung', name: 'Bandar Lampung' },
  { lat: -6.1202, lon: 106.1503, province: 'Banten', name: 'Serang' },
  { lat: -6.2088, lon: 106.8456, province: 'DKI Jakarta', name: 'Jakarta' },
  { lat: -6.9175, lon: 107.6191, province: 'Jawa Barat', name: 'Bandung' },
  { lat: -6.9932, lon: 110.4203, province: 'Jawa Tengah', name: 'Semarang' },
  { lat: -7.8012, lon: 110.3645, province: 'DI Yogyakarta', name: 'Yogyakarta' },
  { lat: -7.2575, lon: 112.7521, province: 'Jawa Timur', name: 'Surabaya' },
  { lat: -8.6705, lon: 115.2126, province: 'Bali', name: 'Denpasar' },
  { lat: -8.5833, lon: 116.1167, province: 'Nusa Tenggara Barat', name: 'Mataram' },
  { lat: -10.1772, lon: 123.607, province: 'Nusa Tenggara Timur', name: 'Kupang' },
  { lat: -0.0263, lon: 109.3425, province: 'Kalimantan Barat', name: 'Pontianak' },
  { lat: -2.2161, lon: 113.9135, province: 'Kalimantan Tengah', name: 'Palangka Raya' },
  { lat: -3.4425, lon: 114.8322, province: 'Kalimantan Selatan', name: 'Banjarbaru' },
  { lat: -0.5022, lon: 117.1537, province: 'Kalimantan Timur', name: 'Samarinda' },
  { lat: 2.8372, lon: 117.3735, province: 'Kalimantan Utara', name: 'Tanjung Selor' },
  { lat: 1.4748, lon: 124.8421, province: 'Sulawesi Utara', name: 'Manado' },
  { lat: 0.5435, lon: 123.0568, province: 'Gorontalo', name: 'Gorontalo' },
  { lat: -0.9003, lon: 119.8779, province: 'Sulawesi Tengah', name: 'Palu' },
  { lat: -2.6787, lon: 118.8879, province: 'Sulawesi Barat', name: 'Mamuju' },
  { lat: -5.1477, lon: 119.4327, province: 'Sulawesi Selatan', name: 'Makassar' },
  { lat: -3.9985, lon: 122.5129, province: 'Sulawesi Tenggara', name: 'Kendari' },
  { lat: -3.6954, lon: 128.1814, province: 'Maluku', name: 'Ambon' },
  { lat: 0.7833, lon: 127.3667, province: 'Maluku Utara', name: 'Sofifi' },
  { lat: -0.8615, lon: 134.0626, province: 'Papua Barat', name: 'Manokwari' },
  { lat: -0.8992, lon: 131.2627, province: 'Papua Barat Daya', name: 'Sorong' },
  { lat: -2.5337, lon: 140.718, province: 'Papua', name: 'Jayapura' },
  { lat: -8.4955, lon: 140.4036, province: 'Papua Selatan', name: 'Merauke' },
  { lat: -3.3667, lon: 135.4833, province: 'Papua Tengah', name: 'Nabire' },
  { lat: -4.0833, lon: 138.9667, province: 'Papua Pegunungan', name: 'Wamena' },
];

interface WeatherApiResponse {
  location: { name: string; lat: number; lon: number };
  current: {
    condition: { text: string; code: number };
    wind_kph: number;
    precip_mm: number;
    humidity: number;
    vis_km: number;
  };
}

@Injectable()
export class WeatherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeatherService.name);
  private pollingTimer: NodeJS.Timeout;

  constructor(
    @InjectModel(WeatherLog) private weatherLogModel: typeof WeatherLog,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    void this.pollMajorCities();
    this.pollingTimer = setInterval(
      () => void this.pollMajorCities(),
      POLL_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    clearInterval(this.pollingTimer);
  }

  private async pollMajorCities(): Promise<void> {
    // Purge records older than STALE_AFTER_MS
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    const stale = await this.weatherLogModel
      .where('fetchedAt', { $lt: cutoff })
      .get();
    for (const s of stale as unknown as WeatherLog[]) {
      await this.weatherLogModel.destroy(s._id.toString());
    }

    let fetched = 0;
    for (const city of MAJOR_CITIES) {
      try {
        await this.fetchAndStore(city.lat, city.lon, city.province);
        fetched++;
      } catch {
        // skip city on error, continue to next
      }
      // Small delay to avoid hitting API rate limits
      await new Promise((r) => setTimeout(r, 300));
    }
    this.logger.log(
      `[Weather] synced ${fetched}/${MAJOR_CITIES.length} provinces`,
    );
  }

  async fetchAndStore(
    latitude: number,
    longitude: number,
    province?: string,
  ): Promise<WeatherLog> {
    const apiKey = this.configService.get<string>('WEATHER_API_KEY');
    const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${latitude},${longitude}`;

    let data: WeatherApiResponse;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`WeatherAPI responded with status ${response.status}`);
      }
      data = (await response.json()) as WeatherApiResponse;
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to fetch weather data: ${(err as Error).message}`,
      );
    }

    const isDangerous =
      data.current.precip_mm >= DANGEROUS_PRECIP_MM ||
      data.current.wind_kph >= DANGEROUS_WIND_KPH ||
      data.current.vis_km < DANGEROUS_VISIBILITY_KM;

    const result = await this.weatherLogModel.create({
      province: province ?? '',
      city: data.location.name,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      condition: data.current.condition.text,
      conditionCode: data.current.condition.code,
      windKph: data.current.wind_kph,
      precipMm: data.current.precip_mm,
      humidity: data.current.humidity,
      visibilityKm: data.current.vis_km,
      isDangerous,
      fetchedAt: new Date(),
    });

    return result as unknown as WeatherLog;
  }

  async getAll(): Promise<WeatherLog[]> {
    const results = await this.weatherLogModel
      .orderBy('fetchedAt', 'desc')
      .get();
    return results as unknown as WeatherLog[];
  }

  async getDangerous(): Promise<WeatherLog[]> {
    const results = await this.weatherLogModel
      .where('isDangerous', true)
      .orderBy('fetchedAt', 'desc')
      .get();
    return results as unknown as WeatherLog[];
  }
}
