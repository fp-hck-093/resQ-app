import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BmkgLogsService } from './bmkg-logs.services';
import { EarthquakeAlert } from './models/earthquake-alert.model';
import { BmkgAlert } from './models/bmkg-alert.model';

@Resolver()
export class BmkgLogsResolver {
  constructor(private bmkgLogsService: BmkgLogsService) {}

  // ─── Earthquake ──────────────────────────────────────────────────────────────

  @Query(() => [EarthquakeAlert])
  async getEarthquakeAlerts(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 })
    limit: number,
  ): Promise<EarthquakeAlert[]> {
    return this.bmkgLogsService.getEarthquakeAlerts(limit);
  }

  @Mutation(() => EarthquakeAlert)
  async syncEarthquakeAlert(): Promise<EarthquakeAlert> {
    return this.bmkgLogsService.syncEarthquakeAlert();
  }

  // ─── Nowcast Alerts ──────────────────────────────────────────────────────────

  @Query(() => [BmkgAlert])
  async getBmkgAlerts(): Promise<BmkgAlert[]> {
    return this.bmkgLogsService.getNowcastAlerts();
  }

  @Query(() => [BmkgAlert])
  async getActiveBmkgAlerts(): Promise<BmkgAlert[]> {
    return this.bmkgLogsService.getActiveNowcastAlerts();
  }

  @Mutation(() => [BmkgAlert])
  async fetchBmkgAlerts(): Promise<BmkgAlert[]> {
    return this.bmkgLogsService.fetchAndStoreNowcastAlerts();
  }
}
