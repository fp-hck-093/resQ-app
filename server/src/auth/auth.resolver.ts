import { Mutation, Args, Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth.response';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/models/user.model';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => String)
  async register(@Args('input') input: RegisterInput): Promise<string> {
    return this.authService.register(input);
  }

  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }

  @UseGuards(JwtGuard)
  @Query(() => User)
  me(@CurrentUser() user: User): User {
    return user;
  }
}
