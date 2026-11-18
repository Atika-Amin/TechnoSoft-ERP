import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './jwt-payload.js';

// Business logic layer for login
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByUsername(dto.username.trim());

    // Same message for every failure, so nobody can guess which usernames exist
    const valid = user && user.isActive && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!valid) throw new UnauthorizedException('Invalid username or password');

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      workingYear: dto.workingYear,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
    };
  }
}
