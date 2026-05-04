import { Module } from '@nestjs/common';
import { MongoloquentModule } from '@mongoloquent/nestjs';
import { UserLocation } from './models/locations.model';
import { LocationsService } from './locations.service';
import { LocationsResolver } from './locations.resolver';

@Module({
  imports: [MongoloquentModule.forFeature([UserLocation])],
  providers: [LocationsService, LocationsResolver],
  exports: [LocationsService],
})
export class LocationsModule {}
