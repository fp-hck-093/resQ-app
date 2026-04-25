import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog, ActivityLogStatus } from './models/activity-log.model';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/models/user.model';

@Resolver()
export class ActivityLogsResolver {
  constructor(private activityLogsService: ActivityLogsService) {}

  @UseGuards(JwtGuard)
  @Query(() => [ActivityLog])
  async getMyActivities(@CurrentUser() user: User): Promise<ActivityLog[]> {
    return this.activityLogsService.findByVolunteer(user._id.toString());
  }

  @UseGuards(JwtGuard)
  @Query(() => [ActivityLog])
  async getActivitiesByRequest(
    @Args('requestId') requestId: string,
  ): Promise<ActivityLog[]> {
    return this.activityLogsService.findByRequest(requestId);
  }

  @UseGuards(JwtGuard)
  @Mutation(() => ActivityLog)
  async updateActivityStatus(
    @Args('requestId') requestId: string,
    @Args('status', { type: () => ActivityLogStatus }) status: ActivityLogStatus,
    @CurrentUser() user: User,
  ): Promise<ActivityLog> {
    return this.activityLogsService.updateStatus(
      user._id.toString(),
      requestId,
      status,
    );
  }
}
