/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.SUPABASE_PROJECT_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();

const remotePatterns = [
  ...(supabaseHost
    ? [
        {
          protocol: 'https',
          hostname: supabaseHost,
          port: '',
          pathname: '/storage/v1/**',
        },
      ]
    : []),
  // Google profile photos (used for OAuth-signed-up agents/users)
  {
    protocol: 'https',
    hostname: 'lh3.googleusercontent.com',
    port: '',
    pathname: '/**',
  },
];

// Security headers applied to every response. CSP is intentionally permissive
// for img/style because Tailwind, Line Awesome icons, and Supabase Storage all
// inject inline styles or load remote assets; tighten as the asset list stabilizes.
//
// CSP is shipped in REPORT-ONLY mode initially. The browser will surface any
// violation in the console + (optionally) POST it to a report endpoint, but
// nothing breaks. Once the report stream is clean for a release or two,
// flip the header key to `Content-Security-Policy` to start enforcing.
//
// What's allowed and why:
//   - script-src: 'self' + 'unsafe-inline' for the line-awesome media-swap shim
//     in app/layout.tsx and for JSON-LD blocks. 'unsafe-eval' is reluctantly
//     allowed because Next.js dev / framer-motion / google-map-react use it;
//     drop it once verified clean in prod.
//   - style-src: 'unsafe-inline' is required by Tailwind (style="...") and
//     react-datepicker / rc-slider inline styles.
//   - img-src: 'self', the Supabase storage CDN, Google profile photos
//     (OAuth-signed-up users), and data: URIs for LQIP blurDataURL.
//   - connect-src: 'self', Supabase (REST + Storage + Realtime websocket),
//     and the Nominatim reverse-geocoder used by /api/geocode/reverse and
//     the location autocomplete fallback.
//   - frame-ancestors: 'self' mirrors X-Frame-Options=SAMEORIGIN.
const SUPABASE_ORIGIN = (() => {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.SUPABASE_PROJECT_URL;
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();
const SUPABASE_WS = SUPABASE_ORIGIN ? SUPABASE_ORIGIN.replace(/^https/, 'wss') : null;

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://lh3.googleusercontent.com${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN}` : ''}`,
  `font-src 'self' data:`,
  `connect-src 'self' https://nominatim.openstreetmap.org${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN} ${SUPABASE_WS}` : ''}`,
  `frame-ancestors 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@supabase/supabase-js'],
  images: {
    remotePatterns,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    // Programmatic SEO routes. App Router doesn't support partial dynamic
    // segments (a folder named `prefix-[slug]` collapses into a single fully-
    // dynamic segment), so we keep clean SEO URLs with rewrites and serve
    // them from conventional /city/[city] and /facet/[facet] dynamic routes.
    // Canonical links and sitemap entries still point at the clean URLs.
    //
    // FACET_SLUGS must stay in sync with src/lib/seo/facets.ts. Adding a
    // facet there requires adding its urlSlug here. Two places, but
    // next.config.js is CJS and can't safely import the TS registry.
    const FACET_SLUGS = [
      // budget
      'cheap-umrah-packages',
      'budget-umrah-packages',
      'luxury-umrah-packages',
      // duration
      '7-day-umrah-package',
      '10-day-umrah-package',
      '14-day-umrah-package',
      '21-day-umrah-package',
      // season
      'ramadan-umrah-2026',
      'ramadan-umrah-2027',
      'december-umrah-packages',
      'winter-umrah-packages',
      // distance
      'umrah-packages-near-haram',
      // feature (tag-based)
      'direct-flight-umrah-packages',
      'vip-umrah-packages',
      'accessible-umrah-packages',
      'popular-umrah-packages',
    ];
    return [
      {
        source: '/umrah-packages-from-:city',
        destination: '/city/:city',
      },
      ...FACET_SLUGS.map((slug) => ({
        source: `/${slug}`,
        destination: `/facet/${slug}`,
      })),
    ];
  },
};

module.exports = nextConfig;
