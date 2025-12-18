/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {},
  transpilePackages: ['@supabase/supabase-js'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
