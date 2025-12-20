import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export function middleware(request: NextRequest) {
  // Protect /account and related pages
  const protectedPaths = [
    '/account',
    '/account-savelists',
    '/account-password',
    '/account-billing',
  ];
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
  if (isProtected) {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Optionally, validate token with Supabase here using the imported supabase client
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/account', '/account-savelists', '/account-password', '/account-billing'],
};
