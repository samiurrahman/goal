import NextTopLoader from 'nextjs-toploader';
import dynamic from 'next/dynamic';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/utils/reactQueryClient';
import { Poppins } from 'next/font/google';
import SiteHeader from './(client-components)/(Header)/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ClientCommons from './ClientCommons';
import './globals.css';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/index.scss';
// Line Awesome is loaded non-blocking via <link> in <head> below (was a
// blocking ~108KB CSS import on every page). The `rc-slider` global CSS was
// removed entirely — the package is unused; only stray .rc-slider-* selectors
// remain in __theme_custom.scss as dead style overrides.
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com'),
  title: {
    default: 'Umrah Packages | Best Islamic Travel Deals',
    template: '%s | Searchumrah',
  },
  description:
    "Compare Umrah packages from verified travel agents across India on Searchumrah — the aggregator with transparent prices, real pilgrim reviews, and direct agent contact, all in one place.",
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
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com',
    siteName: 'Searchumrah',
    title: 'Compare Umrah Packages from Verified Agents',
    description:
      "Compare Umrah packages from verified travel agents across India. Searchumrah is the aggregator with transparent prices, real pilgrim reviews, and direct agent contact.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Umrah Packages from Verified Agents',
    description:
      "Compare Umrah packages from verified agents across India — transparent prices, real reviews, direct agent contact. The Umrah aggregator.",
    creator: '@searchumrah',
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com';
  // Same asset Next.js auto-emits as og:image from src/app/opengraph-image.png.
  // Surfaced in structured data so Google's SERP-thumbnail picker has an
  // explicit, page-associated image to choose — see WebPage schema on the
  // homepage for the primaryImageOfPage signal that pairs with this.
  const brandImage = `${baseUrl}/opengraph-image.png`;

  // Social links are comma-separated absolute URLs in NEXT_PUBLIC_SOCIAL_LINKS.
  // Empty / missing → no sameAs emitted, which is fine; Google ignores empty arrays.
  const socialLinks = (process.env.NEXT_PUBLIC_SOCIAL_LINKS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const telephone = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+91 79 7235 1081';

  // LCP-critical card images come from Supabase Storage. Preconnecting lets the
  // browser do DNS + TLS while HTML is still parsing instead of after the
  // image preload kicks off — typically a 100–300ms head start on LCP.
  let supabaseOrigin: string | null = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    supabaseOrigin = null;
  }

  return (
    <html lang="en" className={poppins.className}>
      <head>
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
        {/*
          Line Awesome is large (~108KB CSS + icon font files) and was previously
          imported globally, render-blocking every page. Above-the-fold homepage
          content (hero, header) uses inline SVG instead, so we can load this
          non-blocking: media="print" lets the browser fetch without blocking
          first paint, then the inline script flips it to media="all" once the
          stylesheet is parsed. <noscript> covers the JS-disabled path.
        */}
        {/* eslint-disable-next-line @next/next/no-css-tags -- intentional: manual <link> is required so we can load non-blocking via media-print swap. A bundled import would be render-blocking, which is the regression we're fixing. */}
        <link
          rel="stylesheet"
          href="/line-awesome/css/line-awesome.min.css"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.querySelector('link[href*="line-awesome"][media="print"]');if(!l)return;var swap=function(){l.media='all';};l.sheet?swap():l.addEventListener('load',swap,{once:true});})();`,
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-css-tags -- same reason as above; only used when JS is off so icons still appear. */}
          <link rel="stylesheet" href="/line-awesome/css/line-awesome.min.css" />
        </noscript>
        <StructuredData
          type="Organization"
          data={{
            name: 'Searchumrah',
            url: baseUrl,
            logo: `${baseUrl}/icon.svg`,
            image: brandImage,
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
            image: brandImage,
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
