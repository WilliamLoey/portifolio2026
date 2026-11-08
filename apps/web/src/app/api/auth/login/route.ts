import { loginResponseSchema, loginSchema } from '@portfolio/contracts';
import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/env.server';
import { SESSION_COOKIE } from '@/lib/session';
import { isSameOrigin } from '@/lib/same-origin';

/**
 * Exchanges credentials for an API session and stores the token in an httpOnly,
 * SameSite=Strict cookie: browser JavaScript never sees it.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Enter your email and password' }, { status: 400 });

  const response = await fetch(`${serverEnv().API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': request.headers.get('user-agent') ?? 'dashboard' },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  }).catch(() => null);

  if (!response) return NextResponse.json({ message: 'The API is unreachable. Try again in a moment.' }, { status: 502 });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    return NextResponse.json({ message: error?.message ?? 'Sign-in failed' }, { status: response.status });
  }

  const session = loginResponseSchema.parse(await response.json());
  const result = NextResponse.json({ user: session.user });
  result.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: serverEnv().NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(session.expiresAt),
  });
  return result;
}
