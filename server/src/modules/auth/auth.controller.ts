import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './jwt-payload.js';

// Presentation layer: receives HTTP requests and hands them to the service
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/auth/login
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // GET /api/auth/me: returns who is logged in (useful for testing the token)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
