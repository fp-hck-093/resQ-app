import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { DangerZonesService } from './danger-zones.service';
import { DangerZone } from './models/danger-zone.model';

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

  @Mutation(() => String)
  async triggerDangerZoneAnalysis(): Promise<string> {
    return this.dangerZonesService.triggerAnalysis();
  }
}
