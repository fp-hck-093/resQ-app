import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { ConfigService } from '@nestjs/config';
import { WeatherLog } from './models/weather-log.model';

const DANGEROUS_PRECIP_MM = 20;
const DANGEROUS_WIND_KPH = 60;
const DANGEROUS_VISIBILITY_KM = 2;

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
export class WeatherService {
  constructor(
    @InjectModel(WeatherLog) private weatherLogModel: typeof WeatherLog,
    private configService: ConfigService,
  ) {}

  async fetchAndStore(
    latitude: number,
    longitude: number,
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
