import { MongoloquentModule } from '@mongoloquent/nestjs';
import { Module } from '@nestjs/common';
import { Request } from './models/request.model';
import { RequestsService } from './requests.service';
import { RequestsResolver } from './requests.resolver';

@Module({
  imports: [MongoloquentModule.forFeature([Request])],
  providers: [RequestsService, RequestsResolver],
  exports: [RequestsService],
})
export class RequestsModule {}
