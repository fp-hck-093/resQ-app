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
    return res.redirect(
      `resq://reset-password?token=${encodeURIComponent(token)}&id=${encodeURIComponent(id)}`,
    );
  }
}
