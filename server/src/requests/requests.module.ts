import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Module } from '@nestjs/common';
import { Request } from './models/request.model';
import { User } from '../users/models/user.model';
import { RequestsService } from './requests.service';
import { RequestsResolver } from './requests.resolver';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [MongoloquentModule.forFeature([Request, User]), ActivityLogsModule],
  providers: [RequestsService, RequestsResolver],
  exports: [RequestsService],
})
export class RequestsModule {}
