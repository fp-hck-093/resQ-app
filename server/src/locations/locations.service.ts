import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@mongoloquent/nestjs';
import { UserLocation, IUserLocation } from './models/locations.model';
import { CreateLocationInput } from './dto/create-location.input';
import { UpdateLocationInput } from './dto/update-location.input';
import { DANGER_ZONE_NOTIFICATION_RADIUS_KM } from '../common/constants/radius.constants';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(UserLocation) private locationModel: typeof UserLocation,
  ) {}

  async addLocation(
    userId: string,
    input: CreateLocationInput,
  ): Promise<UserLocation> {
    const payload: Omit<IUserLocation, '_id' | 'createdAt' | 'updatedAt'> = {
      userId,
      location: { type: 'Point', coordinates: input.coordinates },
      address: input.address,
      city: input.city,
      province: input.province,
      country: input.country,
      notifyOnNewRequests: input.notifyOnNewRequests ?? false,
      notifyOnDangerZones: input.notifyOnDangerZones ?? false,
      notificationRadius: DANGER_ZONE_NOTIFICATION_RADIUS_KM,
    };

    const result = await this.locationModel.create(payload);

    return result as unknown as UserLocation;
  }

  async getMyLocations(userId: string): Promise<UserLocation[]> {
    const results = await this.locationModel
      .where('userId', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return results as unknown as UserLocation[];
  }

  async getLocationById(
    userId: string,
    locationId: string,
  ): Promise<UserLocation> {
    const location = await this.locationModel.find(locationId);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (location.userId.toString() !== userId) {
      throw new BadRequestException('You can only access your own locations');
    }
    return location;
  }

  async updateLocation(
    userId: string,
    input: UpdateLocationInput,
  ): Promise<UserLocation> {
    const location = await this.locationModel.find(input.locationId);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (location.userId.toString() !== userId) {
      throw new BadRequestException('You can only update your own locations');
    }

    const updates: Partial<IUserLocation> = {};
    if (input.notifyOnNewRequests !== undefined) {
      updates.notifyOnNewRequests = input.notifyOnNewRequests;
    }
    if (input.notifyOnDangerZones !== undefined) {
      updates.notifyOnDangerZones = input.notifyOnDangerZones;
    }

    await location.fill(updates).save();
    return location;
  }

  async deleteLocation(userId: string, locationId: string): Promise<string> {
    const location = await this.locationModel.find(locationId);
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (location.userId.toString() !== userId) {
      throw new BadRequestException('You can only delete your own locations');
    }

    await this.locationModel.destroy(locationId);
    return 'Location has been deleted';
  }
}
