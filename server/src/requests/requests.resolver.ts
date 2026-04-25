import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Request } from './models/request.model';
import { RequestsService } from './requests.service';
import { CreateRequestInput } from './dto/create-request.input';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/models/user.model';

@Resolver(() => Request)
export class RequestsResolver {
  constructor(private requestsService: RequestsService) {}

  @UseGuards(JwtGuard)
  @Mutation(() => Request)
  async createRequest(
    @Args('input') input: CreateRequestInput,
    @CurrentUser() currentUser: User,
  ): Promise<Request> {
    input.userId = currentUser._id.toString();
    return this.requestsService.createRequest(input);
  }

  @Query(() => [Request])
  async getAllRequests(): Promise<Request[]> {
    return this.requestsService.getAllRequests();
  }

  @Query(() => [Request])
  async getRequestsByStatus(
    @Args('status') status: string,
  ): Promise<Request[]> {
    return this.requestsService.getRequestsByStatus(status);
  }

  @Query(() => [Request])
  async getRequestsByUserId(
    @Args('userId') userId: string,
  ): Promise<Request[]> {
    return this.requestsService.getRequestsByUserId(userId);
  }

  @UseGuards(JwtGuard)
  @Query(() => [Request])
  async getMyRequests(@CurrentUser() currentUser: User): Promise<Request[]> {
    return this.requestsService.getRequestsByUserId(currentUser._id.toString());
  }

  @Query(() => Request)
  async getRequestById(@Args('id') id: string): Promise<Request> {
    return this.requestsService.getRequestById(id);
  }

  @Query(() => [Request])
  async getNearbyRequests(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number,
    @Args('status', { nullable: true }) status?: string,
    @Args('category', { nullable: true }) category?: string,
  ): Promise<Request[]> {
    return this.requestsService.getNearbyRequests(
      latitude,
      longitude,
      status,
      category,
    );
  }

  @UseGuards(JwtGuard)
  @Mutation(() => String)
  async deleteRequest(
    @Args('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<string> {
    return this.requestsService.deleteRequest(id, currentUser._id.toString());
  }

  @UseGuards(JwtGuard)
  @Mutation(() => Request)
  async volunteerForRequest(
    @Args('requestId') requestId: string,
    @CurrentUser() currentUser: User,
  ): Promise<Request> {
    const currentUserId = currentUser._id.toString();
    return this.requestsService.volunteerForRequest(
      requestId,
      currentUserId,
      currentUserId,
    );
  }

  @UseGuards(JwtGuard)
  @Mutation(() => Request)
  async completeRequest(
    @Args('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<Request> {
    return this.requestsService.updateRequestStatus(
      id,
      currentUser._id.toString(),
    );
  }
}
