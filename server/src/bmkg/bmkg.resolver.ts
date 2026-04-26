import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { BmkgAlert } from './models/bmkg-alert.model';
import { BmkgService } from './bmkg.service';

@Resolver(() => BmkgAlert)
export class BmkgResolver {
  constructor(private bmkgService: BmkgService) {}

  @Query(() => [BmkgAlert])
  async getBmkgAlerts(): Promise<BmkgAlert[]> {
    return this.bmkgService.getAll();
  }

  @Query(() => [BmkgAlert])
  async getActiveBmkgAlerts(): Promise<BmkgAlert[]> {
    return this.bmkgService.getActive();
  }

  @Mutation(() => [BmkgAlert])
  async fetchBmkgAlerts(): Promise<BmkgAlert[]> {
    return this.bmkgService.fetchAndStoreAll();
  }
}
