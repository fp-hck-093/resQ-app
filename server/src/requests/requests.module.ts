import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Module } from '@nestjs/common';
import { Request } from './models/request.model';
import { RequestsService } from './requests.service';
import { RequestsResolver } from './requests.resolver';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongoloquentModule.forFeature([Request]),
    ActivityLogsModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [RequestsService, RequestsResolver],
  exports: [RequestsService],
})
export class RequestsModule {}
