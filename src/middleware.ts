import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export function middleware(request: NextRequest) {
  // Only run for /account route
  if (request.nextUrl.pathname.startsWith('/account')) {
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', '/account');
      return NextResponse.redirect(loginUrl);
    }
    // Optionally, validate token with Supabase here using the imported supabase client
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/account'],
};
