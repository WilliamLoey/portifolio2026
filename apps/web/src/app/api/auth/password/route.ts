import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/env.server';
import { isSameOrigin } from '@/lib/same-origin';
import { SESSION_COOKIE } from '@/lib/session';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'Sign in to continue' }, { status: 401 });
  const response = await fetch(`${serverEnv().API_URL}/auth/password`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  }).catch(() => null);
  if (!response) return NextResponse.json({ message: 'The API is unreachable' }, { status: 502 });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}
