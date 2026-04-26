import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth.response';
import { ForgotPasswordInput } from './dto/forgotPassword.input';
import { ResetPasswordInput } from './dto/resetPassword.input';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
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

  async forgotPassword(input: ForgotPasswordInput): Promise<string> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = (process.env.JWT_SECRET ?? 'secret') + user.password;
    const token = this.jwtService.sign(
      { sub: user._id, email: user.email },
      { secret, expiresIn: '15m' },
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:8081';
    const resetLink = `${frontendUrl}/reset-password?token=${token}&id=${user._id}`;

    await this.mailService.sendResetPasswordEmail(
      user.email,
      user.name,
      resetLink,
    );

    return 'Password reset link has been sent to your email.';
  }

  async resetPassword(input: ResetPasswordInput): Promise<string> {
    const user = await this.usersService.findById(input.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secret = (process.env.JWT_SECRET ?? 'secret') + user.password;

    try {
      const payload = this.jwtService.verify<{ sub: string }>(input.token, {
        secret,
      });
      if (payload.sub !== input.id) {
        throw new Error();
      }
    } catch {
      throw new BadRequestException('Token is invalid or has expired');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, 10);
    await this.usersService.updatePassword(input.id, hashedPassword);

    return 'Password has been reset successfully';
  }
}
