import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { EarthquakeAlert } from './models/earthquake-alert.model';
import { BmkgLogsService } from './bmkg-logs.services';
import { BmkgLogsResolver } from './bmkg-logs.resolver';

@Module({
  imports: [MongoloquentModule.forFeature([EarthquakeAlert])],
  providers: [BmkgLogsService, BmkgLogsResolver],
  exports: [BmkgLogsService],
})
export class BmkgLogsModule {}
