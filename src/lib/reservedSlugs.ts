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
 */
export const RESERVED_AGENT_SLUGS: ReadonlySet<string> = new Set([
  '_next',
  'about',
  'account',
  'account-settings',
  'admin',
  'agent',
  'agents',
  'api',
  'auth',
  'book',
  'booking',
  'booking-success',
  'bookings',
  'checkout',
  'city',
  'contact',
  'dashboard',
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
]);
