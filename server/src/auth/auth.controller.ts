import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  @Get('reset-password')
  redirect(
    @Query('token') token: string,
    @Query('id') id: string,
    @Res() res: Response,
  ) {
    const appUrl = process.env.FRONTEND_URL ?? 'exp://localhost:8081/--';
    return res.redirect(
      `${appUrl}/reset-password?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`,
    );
  }
}
