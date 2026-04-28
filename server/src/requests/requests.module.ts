import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { Request } from './models/request.model';
import { User } from '../users/models/user.model';
import { DangerZone } from '../danger-zones/models/danger-zone.model';
import { EarthquakeAlert } from '../bmkg-logs/models/earthquake-alert.model';
import { BmkgAlert } from '../bmkg-logs/models/bmkg-alert.model';
import { RequestsService } from './requests.service';
import { RequestsResolver } from './requests.resolver';
import { UrgencyScoringProcessor } from './urgency-scoring.processor';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { URGENCY_QUEUE } from './requests.constants';

@Module({
  imports: [
    MongoloquentModule.forFeature([
      Request,
      User,
      DangerZone,
      EarthquakeAlert,
      BmkgAlert,
    ]),
    BullModule.registerQueue({ name: URGENCY_QUEUE }),
    ActivityLogsModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [RequestsService, RequestsResolver, UrgencyScoringProcessor],
  exports: [RequestsService],
})
export class RequestsModule {}
