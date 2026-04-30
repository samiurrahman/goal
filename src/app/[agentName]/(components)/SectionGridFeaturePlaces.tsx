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
  subHeading = 'enjoy hasseless package on one click',
  tabs = ['Umrah', 'Hajj'],
}) => {
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
            className="block rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden"
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
            <div className="p-4 space-y-2">
              <h3 className="text-base font-medium text-neutral-900 dark:text-white line-clamp-1">
                {pkg.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Amount: {pkg.total_duration_days ?? 0} Days
              </p>
              <p className="text-base font-semibold text-secondary-700">
                {pkg.currency ?? 'INR'} {pkg.price_per_person ?? 0}
              </p>
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
