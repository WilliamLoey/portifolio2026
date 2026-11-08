import { createHash } from 'node:crypto';
import type { Request } from 'express';

/** Salted SHA-256 of the client IP: stable enough for rate limits, useless for identifying anyone. */
export function hashIp(request: Request, salt: string): string | null {
  const ip = request.ip ?? request.socket.remoteAddress;
  if (!ip) return null;
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export function userAgent(request: Request): string | null {
  const value = request.headers['user-agent'];
  return typeof value === 'string' ? value : null;
}
