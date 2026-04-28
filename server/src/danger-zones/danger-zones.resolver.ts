import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DangerZonesService } from './danger-zones.service';
import { DangerZone } from './models/danger-zone.model';
import { EarthquakeAlert } from '../bmkg-logs/models/earthquake-alert.model';

@Resolver()
export class DangerZonesResolver {
  constructor(private dangerZonesService: DangerZonesService) {}

  @Query(() => [DangerZone])
  async getActiveDangerZones(): Promise<DangerZone[]> {
    return this.dangerZonesService.getActiveDangerZones();
  }

  @Query(() => [DangerZone])
  async getDangerZonesNear(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
    @Args('radiusKm', { type: () => Float, nullable: true })
    radiusKm?: number,
  ): Promise<DangerZone[]> {
    return this.dangerZonesService.getDangerZonesNear(
      latitude,
      longitude,
      radiusKm,
    );
  }

  @Query(() => [EarthquakeAlert])
  async getEarthquakesNear(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
  ): Promise<EarthquakeAlert[]> {
    return await this.dangerZonesService.getEarthquakesNear(
      latitude,
      longitude,
    );
  }

  @Mutation(() => String)
  async triggerDangerZoneAnalysis(): Promise<string> {
    return this.dangerZonesService.triggerAnalysis();
  }
}
