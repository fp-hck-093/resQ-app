import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog, ActivityLogStatus } from './models/activity-log.model';
import { PaginatedActivityLogs } from './dto/paginated-activity-logs.output';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/models/user.model';

@Resolver()
export class ActivityLogsResolver {
  constructor(private activityLogsService: ActivityLogsService) {}

  @UseGuards(JwtGuard)
  @Query(() => PaginatedActivityLogs)
  async getMyActivityLogs(
    @CurrentUser() user: User,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('status', { type: () => ActivityLogStatus, nullable: true })
    status?: ActivityLogStatus,
    @Args('sortOrder', { nullable: true, defaultValue: 'desc' })
    sortOrder?: string,
  ): Promise<PaginatedActivityLogs> {
    return this.activityLogsService.getMyActivityLogs(
      user._id.toString(),
      page,
      limit,
      status,
      sortOrder === 'asc' ? 'asc' : 'desc',
    );
  }

  @UseGuards(JwtGuard)
  @Mutation(() => ActivityLog)
  async updateActivityStatus(
    @Args('requestId') requestId: string,
    @Args('status', { type: () => ActivityLogStatus })
    status: ActivityLogStatus,
    @CurrentUser() user: User,
  ): Promise<ActivityLog> {
    return this.activityLogsService.updateStatus(
      user._id.toString(),
      requestId,
      status,
    );
  }
}
