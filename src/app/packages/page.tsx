import BgGlassmorphism from '@/components/BgGlassmorphism';
import React from 'react';
import SectionGridFilterCard from './components/SectionGridFilterCard';
import { Metadata } from 'next';
import { buildPackagesQueryArgs, fetchPackages } from '@/lib/queries/packages';
import { Package } from '@/data/types';

// ISR — re-render at most once per minute so SEO crawlers get fresh content
// and visitors get fast cached HTML. Mutations (create/delete/publish toggle)
// hit /api/revalidate which forces an immediate refresh via revalidatePath,
// so agents never have to wait the full 60s to see their own changes.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Umrah Packages 2025 | Compare Best Deals',
  description:
    'Explore and compare hundreds of Umrah packages from verified travel agents. Find the best deals on hotels near Haram in Makkah and Madinah.',
  keywords: [
    'Umrah packages 2025',
    'Umrah packages',
    'Makkah hotels',
    'Madinah hotels',
    'compare packages',
    'best Umrah deals',
    'Ramadan Umrah',
    'Cheap Umrah packages',
  ],
  openGraph: {
    title: 'Umrah Packages 2025 | Compare Best Deals',
    description:
      'Explore and compare hundreds of Umrah packages from verified travel agents.',
    type: 'website',
    images: [
      {
        url: '/images/og-umrah.jpg',
        width: 1200,
        height: 630,
        alt: 'Umrah Packages',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umrah Packages 2025',
    description: 'Find the best spiritual journey packages for Umrah.',
  },
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
  alternates: {
    canonical: '/packages',
  },
};

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

const ListingPackagesPage = async ({ searchParams }: PageProps) => {
  const getParam = (key: string): string | null => {
    const v = searchParams[key];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  const { payload, sort } = buildPackagesQueryArgs(getParam);

  let initialData: Package[] = [];
  try {
    initialData = await fetchPackages({ payload, page: 0, pageSize: PAGE_SIZE, sort });
  } catch {
    // Fail gracefully — client will retry
    initialData = [];
  }

  // JSON-LD Structured Data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Umrah Packages',
    description:
      'Explore and compare hundreds of Umrah packages from verified travel agents.',
    url: 'https://searchumrah.com/packages',
  };

  return (
    <div className={`nc-ListingPackagesPage relative overflow-x-clip`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Decorative background — pinned to viewport so it doesn't scroll with content */}
      <div className="fixed inset-x-0 top-0 -z-10 pointer-events-none">
        <BgGlassmorphism />
      </div>

      <div className="container relative min-h-screen">
        <SectionGridFilterCard className="pb-24 lg:pb-28" initialData={initialData} />
      </div>
    </div>
  );
};

export default ListingPackagesPage;
