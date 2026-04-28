import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Module } from '@nestjs/common';
import { Request } from './models/request.model';
import { User } from '../users/models/user.model';
import { DangerZone } from '../danger-zones/models/danger-zone.model';
import { EarthquakeAlert } from '../bmkg-logs/models/earthquake-alert.model';
import { BmkgAlert } from '../bmkg-logs/models/bmkg-alert.model';
import { RequestsService } from './requests.service';
import { RequestsResolver } from './requests.resolver';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongoloquentModule.forFeature([
      Request,
      User,
      DangerZone,
      EarthquakeAlert,
      BmkgAlert,
    ]),
    ActivityLogsModule,
        NotificationsModule,
    UsersModule,
  ],
  providers: [RequestsService, RequestsResolver],
  exports: [RequestsService],
})
export class RequestsModule {}
