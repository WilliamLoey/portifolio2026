import type { NextRequest } from 'next/server';

/**
 * CSRF defence for cookie-authenticated mutations, on top of SameSite=Strict:
 * the browser's Origin header must match this site.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get('x-forwarded-host') ?? request.headers.get('host'));
  } catch {
    return false;
  }
}
