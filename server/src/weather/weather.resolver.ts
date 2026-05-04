import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { WeatherLog } from './models/weather-log.model';
import { WeatherService } from './weather.service';

@Resolver(() => WeatherLog)
export class WeatherResolver {
  constructor(private weatherService: WeatherService) {}

  @Query(() => [WeatherLog])
  async getWeatherLogs(): Promise<WeatherLog[]> {
    return this.weatherService.getAll();
  }

  @Query(() => [WeatherLog])
  async getDangerousWeather(): Promise<WeatherLog[]> {
    return this.weatherService.getDangerous();
  }

  @Mutation(() => WeatherLog)
  async fetchWeather(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
  ): Promise<WeatherLog> {
    return this.weatherService.fetchAndStore(latitude, longitude);
  }
}
