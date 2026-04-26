import { Mutation, Args, Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth.response';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { ForgotPasswordInput } from './dto/forgotPassword.input';
import { ResetPasswordInput } from './dto/resetPassword.input';
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

  @Mutation(() => String)
  async forgotPassword(
    @Args('input') input: ForgotPasswordInput,
  ): Promise<string> {
    return this.authService.forgotPassword(input);
  }

  @Mutation(() => String)
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ): Promise<string> {
    return this.authService.resetPassword(input);
  }

  @UseGuards(JwtGuard)
  @Query(() => User)
  me(@CurrentUser() user: User): User {
    return user;
  }
}
