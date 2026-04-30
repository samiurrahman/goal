import React, { FC, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Package } from '@/data/types';
import HeaderFilter from './HeaderFilter';

export interface SectionGridFeaturePlacesProps {
  packages?: Package[];
  gridClass?: string;
  heading?: ReactNode;
  subHeading?: ReactNode;
  tabs?: string[];
}

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  packages = [],
  gridClass = '',
  heading = 'Our Packages',
  subHeading = '',
  tabs = ['Umrah', 'Hajj'],
}) => {
  const formatDate = (value: string | Date | null | undefined) => {
    if (!value) return 'TBD';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return 'TBD';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatLocation = (value: string | null | undefined) => {
    if (!value) return 'Location pending';

    return value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  return (
    <div className="nc-SectionGridFeaturePlaces relative">
      <HeaderFilter tabActive={tabs[0]} tabs={tabs} heading={heading} subHeading={subHeading} />
      <div
        className={`grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${gridClass}`}
      >
        {packages.map((pkg) => (
          <Link
            key={pkg.id}
            href={`/${pkg.agent_name ?? ''}/${pkg.slug ?? ''}`}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden"
          >
            <div className="relative w-full aspect-[4/3]">
              <Image
                src={pkg.thumbnail_url || '/default-image.jpg'}
                alt={pkg.title || 'Package image'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="p-4">
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <h3 className="font-semibold capitalize text-neutral-900 dark:text-white text-base">
                    <span className="line-clamp-1">{pkg.title}</span>
                  </h3>
                  <div className="flex items-center text-neutral-500 dark:text-neutral-400 text-sm space-x-1.5">
                    <svg
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="line-clamp-1">
                      {formatLocation(pkg.package_location || pkg.location || pkg.departure_city)}
                    </span>
                  </div>
                  <div className="flex items-center text-neutral-500 dark:text-neutral-400 text-sm space-x-1.5">
                    <svg
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="line-clamp-1">
                      {formatDate(pkg.departure_date)} - {formatDate(pkg.arrival_date)}
                    </span>
                  </div>
                </div>
                <div className="w-14 border-b border-neutral-100 dark:border-neutral-800"></div>
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-secondary-700">
                    {pkg.currency ?? 'INR'} {pkg.price_per_person ?? 0}/Person
                  </span>
                  <span className="inline-flex items-center rounded-full border border-primary-6000 bg-primary-6000 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                    Book Now
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {packages.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">No packages found.</p>
      )}
    </div>
  );
};

export default SectionGridFeaturePlaces;
