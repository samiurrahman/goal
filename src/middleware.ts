import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isProtectedRoute } from '@/constants/protectedRoutes';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/account/:path*',
    '/profile/:path*',
    '/listed-packages/:path*',
    '/my-bookings/:path*',
    '/bookings/:path*',
    '/account-settings/:path*',
    '/account-billing/:path*',
    '/listing/:path*',
    '/page-content/:path*',
  ],
};
