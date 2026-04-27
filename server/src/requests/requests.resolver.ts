import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Request } from './models/request.model';
import { RequestsService } from './requests.service';
import { CreateRequestInput } from './dto/create-request.input';
import { GetRequestsFilterInput } from './dto/get-requests-filter.input';
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
  async getRequests(
    @Args('filter', { nullable: true }) filter?: GetRequestsFilterInput,
  ): Promise<Request[]> {
    return this.requestsService.getRequests(filter);
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
