'use client';

import React, { FC, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Package, Agent } from '@/data/types';
import { getOptimizedImageUrl } from '@/lib/imageUrl';
import { formatPackageLocation } from '@/lib/packageLocation';

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
    data.isDirect ? 'direct flight' : null,
  ].filter(Boolean) as string[];

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[20px] border border-neutral-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_12px_24px_-8px_rgba(17,17,26,0.10),0_8px_16px_-8px_rgba(17,17,26,0.08)]">
      <Link href={data.href} className="absolute inset-0 z-10" aria-label={data.title}>
        <span className="sr-only">{data.title}</span>
      </Link>

      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-primary-100 to-secondary-50">
        <Image
          src={data.thumbnail}
          alt={data.title}
          fill
          sizes="(max-width: 640px) 80vw, 360px"
          quality={75}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          placeholder="blur"
          blurDataURL={data.blur}
          className="object-cover"
        />
        <span className="absolute left-3.5 top-3.5 z-[2] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold leading-none text-secondary-700">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
            <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
          </svg>
          Verified
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-neutral-500">
          <span className="shrink-0 text-[#FACC15]">★</span>
          <b className="shrink-0 font-semibold text-neutral-900">
            {data.ratingPoint > 0 ? data.ratingPoint.toFixed(1) : 'New'}
          </b>
          {data.reviewCount > 0 ? (
            <span className="shrink-0">({data.reviewCount.toLocaleString('en-IN')})</span>
          ) : null}
          <span className="shrink-0 text-neutral-400">·</span>
          <span className="min-w-0 flex-1 truncate">{data.agentName}</span>
        </div>

        <h3 className="m-0 text-[17px] font-semibold leading-snug tracking-[-0.005em] text-neutral-900 line-clamp-2 break-words">
          {data.title}
        </h3>
        {subParts.length > 0 ? (
          <p className="m-0 text-[13px] leading-[1.45] text-neutral-500 line-clamp-1 break-words">
            {subParts.join(' · ')}
          </p>
        ) : null}

        <div className="mt-1 flex flex-wrap gap-1.5">
          {data.packageType ? (
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-primary-700">
              {data.packageType}
            </span>
          ) : null}
          {data.isDirect ? (
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-primary-700">
              Direct flight
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-neutral-200 pt-4">
          <div className="min-w-0 flex-1">
            <span className="block break-words text-[18px] font-semibold leading-[1.1] tracking-[-0.01em] text-primary-900">
              {data.priceLabel}
            </span>
            <span className="mt-0.5 block break-words text-xs text-neutral-500">
              {data.pricePerPerson}
            </span>
          </div>
          <span className="relative z-20 shrink-0 text-[13px] font-semibold text-primary-700 group-hover:underline">
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
          agentLocation: formatPackageLocation(pkg),
        } satisfies CardData;
      });
  }, [packages, agent]);

  const scrollBy = (dir: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const cardWidth = node.firstElementChild?.clientWidth ?? 360;
    node.scrollBy({ left: dir * (cardWidth + 24), behavior: 'smooth' });
  };

  return (
    <section className="nc-SectionGridFeaturePlaces min-w-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 break-words text-2xl font-semibold tracking-[-0.01em] text-neutral-900 md:text-[28px]">
            Our packages
          </h2>
          <p className="mt-1 break-words text-sm text-neutral-500">
            Sacred journeys, trusted guidance — handpicked for every pilgrim.
          </p>
        </div>
        {cards.length > 1 ? (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50"
              aria-label="Scroll packages left"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50"
              aria-label="Scroll packages right"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500">No packages available.</p>
      ) : (
        <div
          ref={scrollerRef}
          className="hiddenScrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 sm:-mx-7 sm:gap-5 sm:px-7 md:-mx-8 md:gap-6 md:px-8"
        >
          {cards.map((card, index) => (
            <div
              key={card.id || index}
              className="w-[82vw] max-w-[340px] shrink-0 snap-start sm:w-[calc(50%-10px)] sm:max-w-none md:w-[calc(50%-12px)] xl:w-[calc(33.333%-16px)]"
            >
              <PackageCard data={card} priority={index < 2} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default SectionGridFeaturePlaces;
