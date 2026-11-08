import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ChangePasswordBody,
  changePasswordSchema,
  LoginBody,
  LoginResponse,
  loginSchema,
  Session,
} from '@portfolio/contracts';
import type { Request } from 'express';
import { AuthService } from '../../../application/auth.service';
import { SessionRecord } from '../../../domain/content';
import { EnvService } from '../../../infrastructure/config/env.service';
import { hashIp, userAgent } from '../support/request-meta';
import { CurrentSession, SessionGuard } from '../support/session.guard';
import { validate } from '../support/zod-validation.pipe';

const presentSession = (s: SessionRecord): Session => ({ user: s.user, expiresAt: s.expiresAt.toISOString() });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly env: EnvService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(validate(loginSchema)) body: LoginBody, @Req() request: Request): Promise<LoginResponse> {
    const { token, session } = await this.auth.login(body.email, body.password, {
      ipHash: hashIp(request, this.env.get('IP_HASH_SALT')),
      userAgent: userAgent(request),
    });
    return { token, ...presentSession(session) };
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentSession() session: SessionRecord): Promise<void> {
    await this.auth.logout(session.id);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentSession() session: SessionRecord): Session {
    return presentSession(session);
  }

  @Post('password')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentSession() session: SessionRecord,
    @Body(validate(changePasswordSchema)) body: ChangePasswordBody,
  ): Promise<void> {
    await this.auth.changePassword(session, body.currentPassword, body.newPassword);
  }
}
