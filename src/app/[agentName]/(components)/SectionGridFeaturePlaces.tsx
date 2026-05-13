'use client';

import React, { FC, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Package, Agent } from '@/data/types';
import { getOptimizedImageUrl } from '@/lib/imageUrl';

const FALLBACK_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgD//Z';

export interface SectionGridFeaturePlacesProps {
  packages?: Package[];
  agent?: Agent | null;
}

type CardData = {
  id: number | string;
  href: string;
  title: string;
  thumbnail: string;
  blur: string;
  ratingPoint: number;
  reviewCount: number;
  agentName: string;
  nights: number | null;
  fromCity: string;
  makkahDistance: number | null;
  packageType: string;
  isDirect: boolean;
  priceLabel: string;
  pricePerPerson: string;
  agentLocation: string;
};

const PackageCard: FC<{ data: CardData; priority?: boolean }> = ({ data, priority }) => {
  const subParts = [
    data.nights != null ? `${data.nights} nights` : null,
    data.fromCity || null,
    data.makkahDistance != null ? `${data.makkahDistance} m to Haram` : null,
    data.isDirect ? 'direct' : null,
  ].filter(Boolean) as string[];

  return (
    <article className="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-3xl overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <Link href={data.href} className="absolute inset-0 z-10" aria-label={data.title}>
        <span className="sr-only">{data.title}</span>
      </Link>

      <div className="relative aspect-[4/3] w-full bg-neutral-100 dark:bg-neutral-800">
        <Image
          src={data.thumbnail}
          alt={data.title}
          fill
          sizes="(max-width: 640px) 80vw, 320px"
          quality={75}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          placeholder="blur"
          blurDataURL={data.blur}
          className="object-cover"
        />
        <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-secondary-50 text-secondary-700 border border-secondary-200 px-2.5 py-1 text-[11px] font-semibold leading-none">
          <i className="las la-check-circle text-sm" />
          Verified agent
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <span className="text-yellow-400">★</span>
          <b className="text-neutral-900 dark:text-neutral-100 font-semibold">
            {data.ratingPoint > 0 ? data.ratingPoint.toFixed(1) : 'New'}
          </b>
          {data.reviewCount > 0 ? <span>({data.reviewCount.toLocaleString('en-IN')})</span> : null}
          <span>·</span>
          <span className="truncate">{data.agentName}</span>
        </div>

        <h3 className="mt-2 text-[17px] font-semibold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2 tracking-tight">
          {data.title}
        </h3>
        {subParts.length > 0 ? (
          <p className="mt-1.5 text-[13px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
            {subParts.join(' · ')}
          </p>
        ) : null}
        {data.agentLocation ? (
          <p className="mt-1 text-[12px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
            <i className="las la-map-marker-alt text-sm" />
            {data.agentLocation}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {data.packageType ? (
            <span className="inline-flex items-center rounded-full bg-white text-primary-700 border border-primary-200 px-2.5 py-1 text-[11px] font-semibold leading-none">
              {data.packageType}
            </span>
          ) : null}
          {data.isDirect ? (
            <span className="inline-flex items-center rounded-full bg-white text-primary-700 border border-primary-200 px-2.5 py-1 text-[11px] font-semibold leading-none">
              Direct flight
            </span>
          ) : null}
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-[20px] font-semibold tracking-tight text-primary-900">
              {data.priceLabel}
            </span>
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
              {data.pricePerPerson}
            </span>
          </div>
          <span className="relative z-20 text-[13px] font-semibold text-primary-700 group-hover:underline">
            View →
          </span>
        </div>
      </div>
    </article>
  );
};

const SectionGridFeaturePlaces: FC<SectionGridFeaturePlacesProps> = ({
  packages = [],
  agent = null,
}) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const cards = useMemo<CardData[]>(() => {
    return packages
      .filter(Boolean)
      .map((pkg) => {
        const agentSlug = (agent?.slug || pkg.agent_name || '').trim();
        const packageSlug = (pkg.slug || '').trim();
        const href =
          agentSlug && packageSlug
            ? `/${encodeURIComponent(agentSlug)}/${encodeURIComponent(packageSlug)}`
            : '/packages';

        const thumb =
          getOptimizedImageUrl(pkg.thumbnail_url, {
            width: 640,
            height: 480,
            resize: 'cover',
            quality: 75,
          }) || pkg.thumbnail_url || '/default-image.jpg';

        let parsedDefault: { value?: number; currency?: string; people?: number } | null = null;
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
        const sharingPeople = parsedDefault?.people;

        return {
          id: pkg.id,
          href,
          title: pkg.title || 'Package',
          thumbnail: thumb,
          blur: pkg.thumbnail_blur || FALLBACK_BLUR_DATA_URL,
          ratingPoint: Number(agent?.rating_avg ?? pkg.agent_rating_avg ?? 0),
          reviewCount: Number(agent?.rating_total ?? pkg.agent_rating_total ?? 0),
          agentName: (agent?.known_as || pkg.agent_known_as || pkg.agent_name || 'Agent').trim(),
          nights: pkg.total_duration_days ?? null,
          fromCity: (pkg.departure_city || '').trim(),
          makkahDistance: pkg.makkah_hotel_distance_m ?? null,
          packageType: (pkg.type || '').trim(),
          isDirect: true,
          priceLabel: `${currency} ${price.toLocaleString('en-IN')}`,
          pricePerPerson: sharingPeople
            ? `/ person · ${sharingPeople} sharing`
            : '/ person',
          agentLocation: [
            pkg.package_location || null,
            pkg.package_admin1_name || pkg.agent_state || null,
            (!pkg.package_admin1_name && !pkg.agent_state && pkg.agent_country) ? pkg.agent_country : null,
          ]
            .filter(Boolean)
            .join(', '),
        } satisfies CardData;
      });
  }, [packages, agent]);

  const scrollBy = (dir: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? 320;
    node.scrollBy({ left: dir * (cardWidth + 16), behavior: 'smooth' });
  };

  return (
    <div className="nc-SectionGridFeaturePlaces relative">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Our Packages
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Sacred journeys, trusted guidance — handpicked for every pilgrim
          </p>
        </div>
        {cards.length > 1 ? (
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-sm"
              aria-label="Scroll packages left"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-sm"
              aria-label="Scroll packages right"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No packages available.</p>
      ) : (
        <div
          ref={scrollerRef}
          className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:-mx-0 md:px-0 scroll-smooth hiddenScrollbar"
        >
          {cards.map((card, index) => (
            <div
              key={card.id || index}
              className="snap-start shrink-0 w-[78vw] sm:w-[340px] md:w-[360px]"
            >
              <PackageCard data={card} priority={index < 2} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionGridFeaturePlaces;
