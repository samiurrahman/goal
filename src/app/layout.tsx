import NextTopLoader from 'nextjs-toploader';
import dynamic from 'next/dynamic';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/utils/reactQueryClient';
import { Poppins } from 'next/font/google';
import SiteHeader from './(client-components)/(Header)/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ClientCommons from './ClientCommons';
import './globals.css';
import '@/fonts/line-awesome-1.3.0/css/line-awesome.css';
import '@/styles/index.scss';
import 'rc-slider/assets/index.css';
import { ReactQueryProvider } from './providers';
import { Metadata } from 'next';
import StructuredData from '@/components/StructuredData';
import SupabaseSessionSync from './SupabaseSessionSync';

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com'),
  title: {
    default: 'Umrah Packages | Best Islamic Travel Deals',
    template: '%s | Searchumrah',
  },
  description:
    'Discover affordable Umrah packages with Searchumrah. Compare prices from verified travel agents, and plan your spiritual journey with ease.',
  keywords: [
    'Umrah packages',
    'Islamic travel',
    'Makkah hotels',
    'Madinah hotels',
    'Umrah deals',
    'pilgrimage packages',
    'umrah scanner',
    'search umrah',
    'best umrah packages',
    'affordable umrah packages',
    'compare umrah prices',
    'umrah travel agents',
    'spiritual journey',
  ],
  authors: [{ name: 'Searchumrah' }],
  creator: 'Searchumrah',
  publisher: 'Searchumrah',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Search engine site verification. Values come from env vars so they can be
  // rotated without code changes. Find these in:
  //   - GSC: Settings → Ownership verification → HTML tag
  //   - Bing: Settings → Verify ownership → Meta tag
  //   - Yandex: Right column → Add site → Meta tag
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '',
      'yandex-verification': process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || '',
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com',
    siteName: 'Searchumrah',
    title: 'Premium Umrah Packages',
    description:
      'Discover affordable Umrah packages with Searchumrah. Compare prices from verified travel agents and plan your spiritual journey.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Premium Umrah Packages',
    description:
      'Discover affordable Umrah packages. Compare prices and book your spiritual journey.',
    creator: '@searchumrah',
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';

  // Social links are comma-separated absolute URLs in NEXT_PUBLIC_SOCIAL_LINKS.
  // Empty / missing → no sameAs emitted, which is fine; Google ignores empty arrays.
  const socialLinks = (process.env.NEXT_PUBLIC_SOCIAL_LINKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const telephone = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+91 79 7235 1081';

  return (
    <html lang="en" className={poppins.className}>
      <head>
        <StructuredData
          type="Organization"
          data={{
            name: 'Searchumrah',
            url: baseUrl,
            logo: `${baseUrl}/icon.svg`,
            description:
              'Premium Umrah travel booking platform connecting pilgrims with verified travel agents',
            telephone,
            socialLinks,
          }}
        />
        <StructuredData
          type="WebSite"
          data={{
            name: 'Searchumrah',
            url: baseUrl,
            description: 'Book Umrah packages online with verified travel agents',
          }}
        />
      </head>
      <body
        className="text-base dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200"
        suppressHydrationWarning
        style={{ background: 'rgb(var(--c-neutral-50))' }}
      >
        <NextTopLoader color="#4f46e5" height={3} showSpinner={false} />
        <ClientCommons />

        <ReactQueryProvider>
          <SupabaseSessionSync />
          <SiteHeader />
          {children}
          <SiteFooter />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
