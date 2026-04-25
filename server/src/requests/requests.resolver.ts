import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Request } from './models/request.model';
import { RequestsService } from './requests.service';
import { CreateRequestInput } from './dto/create-request.input';
import { UpdateRequestStatusInput } from './dto/update-request-status.input';

@Resolver(() => Request)
export class RequestsResolver {
  constructor(private requestsService: RequestsService) {}

  @Mutation(() => Request)
  async createRequest(
    @Args('input') input: CreateRequestInput,
  ): Promise<Request> {
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

  @Mutation(() => Boolean)
  async deleteRequest(@Args('id') id: string): Promise<boolean> {
    return this.requestsService.deleteRequest(id);
  }

  @Mutation(() => Request)
  async updateRequestStatus(
    @Args('input') input: UpdateRequestStatusInput,
  ): Promise<Request> {
    return this.requestsService.updateRequestStatus(
      input.requestId,
      input.status,
    );
  }
}
