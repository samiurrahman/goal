import BgGlassmorphism from '@/components/BgGlassmorphism';
import React from 'react';
import SectionGridFilterCard from './components/SectionGridFilterCard';
import { Metadata } from 'next';
import {
  buildPackagesQueryArgs,
  fetchPackagesExact,
  RelaxedFetchResult,
} from '@/lib/queries/packages';

// ISR — re-render at most once per minute so SEO crawlers get fresh content
// and visitors get fast cached HTML. Mutations (create/delete/publish toggle)
// hit /api/revalidate which forces an immediate refresh via revalidatePath,
// so agents never have to wait the full 60s to see their own changes.
export const revalidate = 60;

export const metadata: Metadata = {
  // Root layout adds `| Searchumrah` via title.template, so don't repeat it here.
  // Title leads with the action verb ("Compare") for higher SERP CTR and
  // explicitly names the aggregator value prop — verified agents + India.
  title: 'Compare Umrah Packages from Verified Agents in India (2026)',
  description:
    "Compare Umrah packages from KYC-verified travel agents across India on Searchumrah — transparent prices, real pilgrim reviews, and direct agent contact for hotels in Makkah and Madinah.",
  keywords: [
    'compare Umrah packages',
    'Umrah packages 2026',
    'Umrah packages India',
    'verified Umrah agents',
    'Makkah hotels',
    'Madinah hotels',
    'best Umrah deals',
    'Ramadan Umrah 2026',
    'cheap Umrah packages',
    'Umrah aggregator',
  ],
  openGraph: {
    title: 'Compare Umrah Packages from Verified Agents in India',
    description:
      "Compare hundreds of Umrah packages from verified travel agents — transparent prices, real pilgrim reviews, direct agent contact.",
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Compare Umrah Packages from Verified Agents — Searchumrah',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Umrah Packages from Verified Agents',
    description:
      'Compare Umrah packages from verified agents across India — transparent prices, real reviews, direct agent contact.',
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

  // Server-side: fast path only — exact match in one DB call. The client
  // owns lazy relaxation, so a /packages?city=akola-in-mh hit with zero
  // exact matches no longer blocks the SSR on a combinatorial query
  // cascade. The client renders the empty exact state immediately and
  // shows "looking for nearby alternatives…" while relaxation runs.
  let initialResult: RelaxedFetchResult = {
    packages: [],
    relaxedFilters: [],
    effectivePayload: payload,
  };
  try {
    const r = await fetchPackagesExact({ payload, pageSize: PAGE_SIZE, sort });
    initialResult = { packages: r.packages, relaxedFilters: [], effectivePayload: r.effectivePayload };
  } catch {
    // Fail gracefully — client will retry
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
        <SectionGridFilterCard
          className="pb-24 lg:pb-28"
          initialData={initialResult.packages}
          initialRelaxedFilters={initialResult.relaxedFilters}
          initialEffectivePayload={initialResult.effectivePayload}
        />
      </div>
    </div>
  );
};

export default ListingPackagesPage;
