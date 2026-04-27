import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { DangerZone } from './models/danger-zone.model';
import { EarthquakeAlert } from '../bmkg-logs/models/earthquake-alert.model';
import { BmkgAlert } from '../bmkg-logs/models/bmkg-alert.model';
import { WeatherLog } from '../weather/models/weather-log.model';
import { Request } from '../requests/models/request.model';
import { DangerZonesService } from './danger-zones.service';
import { DangerZonesResolver } from './danger-zones.resolver';

@Module({
  imports: [
    MongoloquentModule.forFeature([
      DangerZone,
      EarthquakeAlert,
      BmkgAlert,
      WeatherLog,
      Request,
    ]),
  ],
  providers: [DangerZonesService, DangerZonesResolver],
  exports: [DangerZonesService],
})
export class DangerZonesModule {}
