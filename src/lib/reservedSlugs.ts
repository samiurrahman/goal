/**
 * Top-level routes that no agent may claim as a slug.
 *
 * Used in two places:
 *  1. `slug.ts` — when allocating a new agent slug.
 *  2. `middleware.ts` — to skip the redirect lookup for non-agent paths
 *     (we never want to issue a database query for `/api/...`, `/login`, etc.).
 *
 * Kept in its own file (no imports) so the edge-runtime middleware can
 * include it without dragging in `@supabase/supabase-js`.
 *
 * SEO_FACET_SLUGS at the bottom mirrors the urlSlug list in
 * `src/lib/seo/facets.ts`. They live here (not as an import) so the
 * edge-runtime middleware stays import-free, and so an agent named e.g.
 * "Cheap Umrah Packages Pvt Ltd" can never claim a slug that would
 * shadow a programmatic facet page.
 */
export const RESERVED_AGENT_SLUGS: ReadonlySet<string> = new Set([
  '_next',
  'about',
  'account',
  'account-settings',
  'admin',
  'agencies',
  'agent',
  'agents',
  'api',
  'auth',
  'blog',
  'book',
  'booking',
  'booking-success',
  'bookings',
  'checkout',
  'city',
  'contact',
  'dashboard',
  'facet',
  'forgot-password',
  'help',
  'home',
  'images',
  'interested-users',
  'listed-packages',
  'listing',
  'login',
  'logout',
  'my-bookings',
  'package',
  'packages',
  'page-content',
  'pay-done',
  'privacy',
  'profile',
  'public',
  'reset-password',
  'review',
  'reviews',
  'robots.txt',
  'search',
  'searchumrah',
  'settings',
  'signin',
  'signup',
  'sitemap.xml',
  'static',
  'support',
  'system',
  'terms',
  'umrah',
  'user',
  // SEO facet slugs — mirrors src/lib/seo/facets.ts urlSlug list. See
  // file header for why they live here. Keep alphabetised within each
  // category for easy diffing.
  '10-day-umrah-package',
  '14-day-umrah-package',
  '21-day-umrah-package',
  '7-day-umrah-package',
  'accessible-umrah-packages',
  'budget-umrah-packages',
  'cheap-umrah-packages',
  'december-umrah-packages',
  'direct-flight-umrah-packages',
  'luxury-umrah-packages',
  'popular-umrah-packages',
  'ramadan-umrah-2026',
  'ramadan-umrah-2027',
  'umrah-packages-near-haram',
  'vip-umrah-packages',
  'winter-umrah-packages',
]);
