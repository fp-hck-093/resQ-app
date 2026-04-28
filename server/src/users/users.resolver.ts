import { Resolver, Mutation, Args, Query, Int } from '@nestjs/graphql';
import { NotFoundException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { PaginatedUsers } from './dto/paginated-users.output';
import { UpdateLocationInput } from './dto/update-location.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver()
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtGuard)
  @Query(() => [User])
  async getUsers(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @UseGuards(JwtGuard)
  @Query(() => PaginatedUsers)
  async searchUsers(
    @Args('name') name: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<PaginatedUsers> {
    return this.usersService.searchUsers(name, page, limit);
  }

  @UseGuards(JwtGuard)
  @Query(() => User)
  async getUser(@Args('id') id: string): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @UseGuards(JwtGuard)
  @Mutation(() => String)
  async changePassword(
    @CurrentUser() user: User,
    @Args('input') input: ChangePasswordInput,
  ): Promise<string> {
    return this.usersService.changePassword(user._id, input);
  }

  @UseGuards(JwtGuard)
  @Mutation(() => User, { nullable: true })
  async updateUser(
    @CurrentUser() user: User,
    @Args('input') input: UpdateUserInput,
  ): Promise<User | null> {
    return this.usersService.updateUser(user._id, input);
  }

  @UseGuards(JwtGuard)
  @Mutation(() => String)
  async savePushToken(
    @CurrentUser() user: User,
    @Args('token') token: string,
  ): Promise<string> {
    await this.usersService.savePushToken(user._id, token);
    return 'Push token saved';
  }

  @UseGuards(JwtGuard)
  @Mutation(() => User, { nullable: true })
  async updateLocation(
    @CurrentUser() user: User,
    @Args('input') input: UpdateLocationInput,
  ): Promise<User | null> {
    return this.usersService.updateLocation(user._id, input);
  }
}
