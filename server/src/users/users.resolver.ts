import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { UpdateLocationInput } from './dto/update-location.input';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver()
export class UsersResolver {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtGuard)
  @Mutation(() => User, { nullable: true })
  async updateLocation(
    @CurrentUser() user: User,
    @Args('input') input: UpdateLocationInput,
  ): Promise<User | null> {
    return this.usersService.updateLocation(user._id, input);
  }
}
