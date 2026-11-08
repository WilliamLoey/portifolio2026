import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/env.server';
import { isSameOrigin } from '@/lib/same-origin';
import { SESSION_COOKIE } from '@/lib/session';

type Context = { params: Promise<{ path: string[] }> };

/**
 * Same-origin proxy for the dashboard (backend-for-frontend): reads the httpOnly session
 * cookie and forwards the call to the API's /admin routes with a Bearer token.
 * Authorisation is decided by the API on every request, not here.
 */
async function proxy(request: NextRequest, { params }: Context) {
  const { path } = await params;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ statusCode: 401, error: 'UNAUTHORIZED', message: 'Sign in to continue' }, { status: 401 });

  if (request.method !== 'GET' && !isSameOrigin(request)) {
    return NextResponse.json({ statusCode: 403, error: 'FORBIDDEN', message: 'Invalid origin' }, { status: 403 });
  }

  const target = `${serverEnv().API_URL}/admin/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const headers = new Headers({ authorization: `Bearer ${token}` });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const init: RequestInit & { duplex?: 'half' } = { method: request.method, headers, cache: 'no-store' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half'; // Node's fetch needs this to stream a request body (image uploads)
  }

  const response = await fetch(target, init).catch(() => null);
  if (!response) {
    return NextResponse.json({ statusCode: 502, error: 'BAD_GATEWAY', message: 'The API is unreachable' }, { status: 502 });
  }

  const body = response.status === 204 ? null : await response.arrayBuffer();
  const result = new NextResponse(body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' },
  });
  if (response.status === 401) result.cookies.delete(SESSION_COOKIE);
  return result;
}

export { proxy as DELETE, proxy as GET, proxy as PATCH, proxy as POST, proxy as PUT };
