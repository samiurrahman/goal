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
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
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
};

module.exports = nextConfig;
