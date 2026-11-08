import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { SESSION_COOKIE } from './lib/session';

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The dashboard is English-only and outside the i18n routing.
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const isLogin = pathname === '/dashboard/login';
    // Fast redirect only. The session itself is verified against the API by the dashboard layout,
    // and every API call is authorised by the API.
    if (!isLogin && !request.cookies.get(SESSION_COOKIE)) {
      const url = new URL('/dashboard/login', request.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  const response = intl(request);
  if (pathname.includes('/preview/')) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
