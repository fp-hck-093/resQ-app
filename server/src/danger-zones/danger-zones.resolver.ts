import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DangerZonesService } from './danger-zones.service';
import { DangerZone } from './models/danger-zone.model';
import { EarthquakeAlert } from '../bmkg-logs/models/earthquake-alert.model';
import { BmkgAlert } from '../bmkg-logs/models/bmkg-alert.model';
import { CoordinateInput } from './dto/coordinate.input';

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

  @Query(() => [BmkgAlert])
  async getBmkgAlertsNear(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
  ): Promise<BmkgAlert[]> {
    return await this.dangerZonesService.getBmkgAlertsNear(latitude, longitude);
  }

  @Query(() => [DangerZone])
  async getDangerZonesForLocations(
    @Args('locations', { type: () => [CoordinateInput] })
    locations: CoordinateInput[],
  ): Promise<DangerZone[]> {
    return this.dangerZonesService.getDangerZonesForLocations(locations);
  }

  @Mutation(() => String)
  async triggerDangerZoneAnalysis(): Promise<string> {
    return this.dangerZonesService.triggerAnalysis();
  }

  @Mutation(() => String)
  async testDangerZoneNotification(
    @Args('pushToken') pushToken: string,
  ): Promise<string> {
    await this.dangerZonesService.testPushNotification(pushToken);
    return 'Test notification sent';
  }
}
