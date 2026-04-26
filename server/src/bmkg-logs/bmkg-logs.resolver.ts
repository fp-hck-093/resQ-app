import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BmkgLogsService } from './bmkg-logs.services';
import { EarthquakeAlert } from './models/earthquake-alert.model';

@Resolver()
export class BmkgLogsResolver {
  constructor(private bmkgLogsService: BmkgLogsService) {}

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
}
