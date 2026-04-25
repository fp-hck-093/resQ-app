import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserLocation } from './models/locations.model';
import { LocationsService } from './locations.service';
import { CreateLocationInput } from './dto/create-location.input';
import { UpdateLocationInput } from './dto/update-location.input';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/models/user.model';

@UseGuards(JwtGuard)
@Resolver(() => UserLocation)
export class LocationsResolver {
  constructor(private locationsService: LocationsService) {}

  @Query(() => [UserLocation])
  async getMyLocations(
    @CurrentUser() currentUser: User,
  ): Promise<UserLocation[]> {
    return this.locationsService.getMyLocations(currentUser._id.toString());
  }

  @Query(() => UserLocation)
  async getLocationById(
    @Args('locationId') locationId: string,
    @CurrentUser() currentUser: User,
  ): Promise<UserLocation> {
    return this.locationsService.getLocationById(
      currentUser._id.toString(),
      locationId,
    );
  }

  @Mutation(() => UserLocation)
  async addLocation(
    @Args('input') input: CreateLocationInput,
    @CurrentUser() currentUser: User,
  ): Promise<UserLocation> {
    return this.locationsService.addLocation(currentUser._id.toString(), input);
  }

  @Mutation(() => UserLocation)
  async updateLocation(
    @Args('input') input: UpdateLocationInput,
    @CurrentUser() currentUser: User,
  ): Promise<UserLocation> {
    return this.locationsService.updateLocation(
      currentUser._id.toString(),
      input,
    );
  }

  @Mutation(() => String)
  async deleteLocation(
    @Args('locationId') locationId: string,
    @CurrentUser() currentUser: User,
  ): Promise<string> {
    return this.locationsService.deleteLocation(
      currentUser._id.toString(),
      locationId,
    );
  }
}
