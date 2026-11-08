import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../../application/auth.service';
import { SessionRecord } from '../../../domain/content';

export type AuthenticatedRequest = Request & { session?: SessionRecord };

/**
 * Every /admin endpoint is authorised here, on the API. The website's route checks
 * are only a convenience; they are never trusted.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sign in to continue');
    request.session = await this.auth.authenticate(token);
    return true;
  }
}

export const CurrentSession = createParamDecorator((_: unknown, context: ExecutionContext): SessionRecord => {
  const session = context.switchToHttp().getRequest<AuthenticatedRequest>().session;
  if (!session) throw new UnauthorizedException('Sign in to continue');
  return session;
});
