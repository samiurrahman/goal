'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { useCityPackageCounts } from '@/hooks/useCityPackageCounts';
import { getCityImage } from '@/data/cityLandmarks';

const SectionTopCitiesMobile = () => {
  const { data, isLoading } = useCityPackageCounts(10);

  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <section className="mt-6">
      <h2 className="px-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Top destinations
      </h2>

      <div className="hiddenScrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-44 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
              >
                <div className="aspect-[4/3] rounded-2xl" />
                <div className="px-2 py-3 space-y-2">
                  <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
              </div>
            ))
          : data!.map(({ city, count }) => (
              <Link
                key={city}
                href={`/packages?location=${encodeURIComponent(city)}`}
                className="flex-shrink-0 w-44 snap-start rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 overflow-hidden active:scale-[0.98] transition-transform"
              >
                <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-700">
                  <Image
                    src={getCityImage(city)}
                    alt={`${city} landmark`}
                    fill
                    sizes="176px"
                    className="object-cover"
                  />
                </div>
                <div className="px-3 py-2.5">
                  <div className="flex items-center text-neutral-900 dark:text-neutral-100">
                    <MapPinIcon className="w-4 h-4 text-primary-6000 flex-shrink-0" />
                    <span className="ml-1 text-sm font-semibold truncate">{city}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {count} {count === 1 ? 'package' : 'packages'}
                  </p>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
};

export default SectionTopCitiesMobile;
