import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth.response';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<string> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    await this.usersService.create({
      ...input,
      password: hashedPassword,
    });

    return 'Register success';
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedException('Email / Password invalid');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email / Password invalid');
    }

    const token = this.jwtService.sign({ sub: user._id, email: user.email });

    return { token, user };
  }
}
