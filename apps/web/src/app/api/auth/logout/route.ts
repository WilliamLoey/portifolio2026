import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/env.server';
import { isSameOrigin } from '@/lib/same-origin';
import { SESSION_COOKIE } from '@/lib/session';

/** Revokes the session on the API (not just the cookie), then clears the cookie. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${serverEnv().API_URL}/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => null);
  }
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
