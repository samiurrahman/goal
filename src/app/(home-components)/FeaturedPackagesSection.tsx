'use client';

import React, { FC, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package } from '@/data/types';
import { getOptimizedImageUrl } from '@/lib/imageUrl';
import { sanitizePackageTags, packageTagTone } from '@/constants/packageTags';

const FALLBACK_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgD//Z';

const ALL_KEY = '__all__';

export interface FeaturedPackagesSectionProps {
  packages: Package[];
}

const FeaturedPackagesSection: FC<FeaturedPackagesSectionProps> = ({ packages }) => {
  const [activeCity, setActiveCity] = useState<string>(ALL_KEY);

  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pkg of packages) {
      const city = (pkg.departure_city || '').trim();
      if (!city) continue;
      counts.set(city, (counts.get(city) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => ({ city, count }));
  }, [packages]);

  const visiblePackages = useMemo(() => {
    if (activeCity === ALL_KEY) return packages;
    return packages.filter((pkg) => (pkg.departure_city || '').trim() === activeCity);
  }, [activeCity, packages]);

  return (
    <section className="bg-white dark:bg-neutral-900 py-8 lg:py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8 md:mb-10">
          <div className="max-w-2xl">
            <span className="text-[12px] tracking-[0.12em] uppercase font-light text-primary-700">
              Featured Umrah packages
            </span>
            <h2 className="mt-2 text-3xl lg:text-[32px] leading-tight font-light text-neutral-900 dark:text-neutral-100 tracking-tight">
              Verified packages, ready to book.
            </h2>
            <p className="mt-3 text-base lg:text-[14px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Curated this week from the agents with the highest pilgrim satisfaction. Filter by
              your departure city or hotel proximity to the Haram.
            </p>
          </div>
          <Link
            href="/packages"
            className="inline-flex items-center justify-center self-start md:self-auto rounded-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:border-neutral-500 dark:hover:border-neutral-500 transition whitespace-nowrap"
          >
            View all →
          </Link>
        </div>

        {/* City filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-7 hiddenScrollbar">
          <FilterChip
            label="All"
            count={packages.length}
            active={activeCity === ALL_KEY}
            onClick={() => setActiveCity(ALL_KEY)}
          />
          {cityCounts.map(({ city, count }) => (
            <FilterChip
              key={city}
              label={city}
              count={count}
              active={activeCity === city}
              onClick={() => setActiveCity(city)}
            />
          ))}
        </div>

        {/* Cards grid */}
        {visiblePackages.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 py-12 text-center">
            No packages match this filter yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {visiblePackages.map((pkg, idx) => (
              <PackageCard key={pkg.id ?? idx} pkg={pkg} priority={idx < 3} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const FilterChip: FC<{
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}> = ({ label, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium border whitespace-nowrap flex-shrink-0 transition ${
      active
        ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900'
        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-500'
    }`}
  >
    <span>{label}</span>
    {typeof count === 'number' ? (
      <span
        className={
          active
            ? 'text-white/60 dark:text-neutral-900/60 font-normal'
            : 'text-neutral-400 font-normal'
        }
      >
        {count}
      </span>
    ) : null}
  </button>
);

const PackageCard: FC<{ pkg: Package; priority?: boolean }> = ({ pkg, priority = false }) => {
  const agentSlug = (pkg.agent_name || '').trim();
  const packageSlug = (pkg.slug || '').trim();
  const href =
    agentSlug && packageSlug
      ? `/${encodeURIComponent(agentSlug)}/${encodeURIComponent(packageSlug)}`
      : '/packages';

  let parsedDefault: { value?: number; currency?: string } | null = null;
  try {
    parsedDefault =
      typeof pkg.default_pricing === 'string'
        ? JSON.parse(pkg.default_pricing)
        : (pkg.default_pricing as typeof parsedDefault);
  } catch {
    parsedDefault = null;
  }
  const currency = parsedDefault?.currency || pkg.currency || 'INR';
  const price = Number(parsedDefault?.value ?? pkg.price_per_person ?? 0);

  const thumb =
    getOptimizedImageUrl(pkg.thumbnail_url, {
      width: 640,
      height: 512,
      resize: 'cover',
      quality: 75,
    }) ||
    pkg.thumbnail_url ||
    '/default-image.jpg';

  const rating = Number(pkg.agent_rating_avg ?? 0);
  const reviews = Number(pkg.agent_rating_total ?? 0);
  const agentName = (pkg.agent_known_as || pkg.agent_name || 'Agent').trim();
  const nights =
    typeof pkg.total_duration_days === 'number' && pkg.total_duration_days > 0
      ? `${pkg.total_duration_days} nights`
      : null;
  const distance =
    typeof pkg.makkah_hotel_distance_m === 'number' && pkg.makkah_hotel_distance_m > 0
      ? `${pkg.makkah_hotel_distance_m} m to Haram`
      : null;
  const subParts = [nights, distance].filter(Boolean) as string[];

  const tags = sanitizePackageTags(pkg.tags);

  return (
    <article className="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl overflow-hidden flex flex-col transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-neutral-300 dark:hover:border-neutral-600">
      <Link href={href} aria-label={pkg.title} className="absolute inset-0 z-10">
        <span className="sr-only">{pkg.title}</span>
      </Link>

      <div className="relative aspect-[5/4] w-full bg-primary-100 dark:bg-neutral-800">
        <Image
          src={thumb}
          alt={pkg.title || 'Package image'}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={75}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          placeholder="blur"
          blurDataURL={pkg.thumbnail_blur || FALLBACK_BLUR_DATA_URL}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
        <span className="absolute top-3.5 left-3.5 z-20 inline-flex items-center gap-1.5 rounded-full bg-secondary-50 border border-secondary-200 text-secondary-700 px-2.5 py-1 text-[11px] font-semibold leading-none">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
            <path d="M6 0L7.5 1.5L9.6 1L10 3.1L11.5 4.6L10.6 6.5L11 8.5L9 9L7.8 10.6L6 10L4.2 10.6L3 9L1 8.5L1.4 6.5L0.5 4.6L2 3.1L2.4 1L4.5 1.5L6 0z" />
          </svg>
          Verified
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5 sm:p-6 gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <span className="text-yellow-400">★</span>
          <b className="text-neutral-900 dark:text-neutral-100 font-semibold">
            {rating > 0 ? rating.toFixed(1) : 'New'}
          </b>
          {reviews > 0 ? (
            <span className="text-neutral-500">({reviews.toLocaleString('en-IN')})</span>
          ) : null}
          <span className="text-neutral-300 dark:text-neutral-500 px-1">·</span>
          <span className="truncate">{agentName}</span>
        </div>

        <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-100 line-clamp-2">
          {pkg.title}
        </h3>

        {(pkg.departure_city || subParts.length > 0) && (
          <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-1">
            {pkg.departure_city ? `Departs ${pkg.departure_city}` : null}
            {pkg.departure_city && subParts.length > 0 ? ' · ' : ''}
            {subParts.join(' · ')}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.map((tag) => {
              const tone = packageTagTone(tag);
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${
                    tone === 'popular'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-primary-50 text-primary-700'
                  }`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between border-t border-neutral-200 dark:border-neutral-700">
          <div>
            <div className="text-[18px] font-semibold text-primary-900 dark:text-primary-200 tracking-tight leading-tight">
              {currency} {price.toLocaleString('en-IN')}
            </div>
            <div className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              / person · twin sharing
            </div>
          </div>
          <span className="relative z-20 text-[13px] font-semibold text-primary-700 group-hover:underline">
            View →
          </span>
        </div>
      </div>
    </article>
  );
};

export default FeaturedPackagesSection;
