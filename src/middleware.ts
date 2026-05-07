import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isProtectedRoute } from '@/constants/protectedRoutes';
import { RESERVED_AGENT_SLUGS } from '@/lib/reservedSlugs';

/**
 * Look up an old agent slug in `agent_slug_redirects` via PostgREST.
 *
 * Uses raw fetch (not the supabase JS client) to keep this file edge-runtime
 * friendly. Returns the new slug, or null if the slug isn't a known redirect.
 */
async function findRedirectFor(oldSlug: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const url = `${supabaseUrl}/rest/v1/agent_slug_redirects?old_slug=eq.${encodeURIComponent(
      oldSlug
    )}&select=new_slug&limit=1`;

    const res = await fetch(url, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        Accept: 'application/json',
      },
      // The redirect mapping is stable enough to cache for a minute on the edge.
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ new_slug?: string }>;
    return rows?.[0]?.new_slug ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Protected routes — auth gate
  if (isProtectedRoute(pathname)) {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Agent slug redirect — only relevant on /{slug} or /{slug}/{...}
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const firstSegment = segments[0].toLowerCase();

    // Skip system routes — never look up agent redirects for these
    if (!RESERVED_AGENT_SLUGS.has(firstSegment) && !firstSegment.includes('.')) {
      const newSlug = await findRedirectFor(firstSegment);
      if (newSlug && newSlug !== firstSegment) {
        const rest = segments.slice(1).join('/');
        const target = new URL(rest ? `/${newSlug}/${rest}` : `/${newSlug}`, request.url);
        target.search = request.nextUrl.search;
        return NextResponse.redirect(target, 301);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except Next.js internals, API routes, and static assets.
  // The middleware itself short-circuits early for reserved paths so the
  // redirect lookup only fires for paths that *might* be agent slugs.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
