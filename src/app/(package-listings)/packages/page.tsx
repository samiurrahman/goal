import BgGlassmorphism from '@/components/BgGlassmorphism';
import React from 'react';
import SectionGridFilterCard from '../SectionGridFilterCard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hajj & Umrah Packages 2025 | Compare Best Deals',
  description:
    'Explore and compare hundreds of Hajj and Umrah packages from verified travel agents. Find the best deals on hotels near Haram in Makkah and Madinah.',
  keywords: [
    'Hajj packages 2025',
    'Umrah packages',
    'Makkah hotels',
    'Madinah hotels',
    'compare packages',
    'best Hajj deals',
    'Ramadan Umrah',
    'Cheap Umrah packages',
  ],
  openGraph: {
    title: 'Hajj & Umrah Packages 2025 | Compare Best Deals',
    description:
      'Explore and compare hundreds of Hajj and Umrah packages from verified travel agents.',
    type: 'website',
    // url: "https://your-domain.com/packages", // Recommended: Add your absolute URL here
    images: [
      {
        url: '/images/og-hajj-umrah.jpg', // Recommended: Add a specific OG image path
        width: 1200,
        height: 630,
        alt: 'Hajj and Umrah Packages',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hajj & Umrah Packages 2025',
    description: 'Find the best spiritual journey packages for Hajj and Umrah.',
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

const ListingPackagesPage = () => {
  // JSON-LD Structured Data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Hajj & Umrah Packages',
    description:
      'Explore and compare hundreds of Hajj and Umrah packages from verified travel agents.',
    url: 'https://your-domain.com/packages', // Replace with your actual domain
  };

  return (
    <div className={`nc-ListingPackagesPage relative overflow-hidden`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="sticky top-0 z-0">
        <BgGlassmorphism />
      </div>

      <div className="container relative min-h-screen">
        <SectionGridFilterCard className="pb-24 lg:pb-28" />
      </div>
    </div>
  );
};

export default ListingPackagesPage;
