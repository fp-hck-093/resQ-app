import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogsResolver } from './activity-logs.resolver';
import { ActivityLog } from './models/activity-log.model';

@Module({
  imports: [MongoloquentModule.forFeature([ActivityLog])],
  providers: [ActivityLogsService, ActivityLogsResolver],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
