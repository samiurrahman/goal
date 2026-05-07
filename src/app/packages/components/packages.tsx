'use client';
import React, { FC, useMemo } from 'react';
import StartRating from '@/components/StartRating';
import Badge from '@/shared/Badge';
import { Package } from '@/data/types';
import Link from 'next/link';
import Image from 'next/image';
import { MadinaIcon, MakkahIcon } from '@/components/icons/icons';
import Avatar from '@/shared/Avatar';
import { getOptimizedImageUrl } from '@/lib/imageUrl';

// Neutral 2x2 gray JPEG used as fallback blur for packages without a stored LQIP
const FALLBACK_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgD//Z';

type SharingRateItem = { value: string; people: number; default: boolean };

export interface PackagesProps {
  className?: string;
  data?: Package;
  agentProfileImage?: string | null;
  agentDisplayName?: string;
  agentSlug?: string;
  agentRatingPoint?: number;
  agentReviewCount?: number;
  priority?: boolean;
}

const Packages: FC<PackagesProps> = ({
  className = '',
  data = {} as Package,
  agentProfileImage,
  agentDisplayName,
  agentSlug,
  agentRatingPoint = 0,
  agentReviewCount = 0,
  priority = false,
}) => {

  const profileImage =
    agentProfileImage || (data as Package & { profile_image?: string | null }).profile_image;
  const {
    title,
    price_per_person,
    total_duration_days,
    currency,
    thumbnail_url,
    thumbnail_blur,
    slug,
    agent_name,
    makkah_hotel_name,
    madinah_hotel_name,
    makkah_hotel_distance_m,
    madinah_hotel_distance_m,
    departure_city,
    arrival_city,
    sharing_rate,
    default_pricing,
    departure_date,
    arrival_date,
    package_location,
  } = data;

  const parsedDefaultPricing = useMemo(() => {
    try {
      if (!default_pricing) return null;
      const parsed =
        typeof default_pricing === 'string' ? JSON.parse(default_pricing) : default_pricing;
      return parsed as { people?: number; value?: number; currency?: string };
    } catch {
      return null;
    }
  }, [default_pricing]);

  const sharingRateArray = useMemo<SharingRateItem[]>(() => {
    try {
      if (!sharing_rate) return [];
      const parsed = typeof sharing_rate === 'string' ? JSON.parse(sharing_rate) : sharing_rate;
      return parsed?.json?.rates ?? parsed?.rates ?? [];
    } catch {
      return [];
    }
  }, [sharing_rate]);

  const defaultSharingRate = useMemo(
    () => sharingRateArray.find((r) => r.default) ?? sharingRateArray[0],
    [sharingRateArray]
  );

  const displayCurrency = parsedDefaultPricing?.currency || currency || 'INR';
  const displayPrice = Number(
    parsedDefaultPricing?.value ?? defaultSharingRate?.value ?? price_per_person ?? 0
  );

  const formatDateDMY = (dateInput?: string | Date) => {
    if (!dateInput) return '';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const resolvedAgentSlug = (agentSlug || agent_name || '').trim();
  const packageSlug = (slug || '').trim();
  const packageHref =
    resolvedAgentSlug && packageSlug
      ? `/${encodeURIComponent(resolvedAgentSlug)}/${encodeURIComponent(packageSlug)}`
      : '/packages';
  const agentHref = resolvedAgentSlug ? `/${encodeURIComponent(resolvedAgentSlug)}` : '/packages';
  const displayAgentName = (agentDisplayName || agent_name || '').trim() || 'Agent';

  return (
    <article
      className={`nc-PropertyCardH group relative bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 ${className}`}
    >
      <Link href={packageHref} className="absolute inset-0 z-10" aria-label={title}>
        <span className="sr-only">{title}</span>
      </Link>
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full aspect-[16/10] sm:aspect-auto sm:w-72 sm:flex-shrink-0 sm:self-stretch bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <Image
            src={
              getOptimizedImageUrl(thumbnail_url, {
                width: 600,
                height: 400,
                resize: 'cover',
                quality: 75,
              }) || '/default-image.jpg'
            }
            alt={title || 'Package image'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 288px"
            quality={75}
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            placeholder="blur"
            blurDataURL={thumbnail_blur || FALLBACK_BLUR_DATA_URL}
          />

          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-neutral-900/80 backdrop-blur-md shadow-lg ring-1 ring-white/10">
              <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner ring-1 ring-amber-300/50">
                <svg
                  viewBox="0 0 12 12"
                  className="w-3 h-3"
                  fill="none"
                  stroke="#78350F"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="2.5 6 5 8.5 9.5 3.5" />
                </svg>
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[10px] font-bold text-white tracking-wider uppercase">
                  Verified
                </span>
                <span className="text-[7px] font-medium text-amber-200/80 uppercase tracking-[0.15em] mt-[1px]">
                  Government
                </span>
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-grow flex-col gap-3 p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base sm:text-lg font-semibold capitalize leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100 min-w-0">
              {title}
            </h3>
            <Badge name="ADS" color="green" className="flex-shrink-0" />
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <span className="inline-flex items-center gap-1">
              <i className="las la-clock text-base"></i>
              {total_duration_days} Days
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="las la-share-alt text-base"></i>
              {parsedDefaultPricing?.people ?? defaultSharingRate?.people} Sharing
            </span>
            {package_location ? (
              <span className="inline-flex items-center gap-1">
                <i className="las la-map-marker text-base"></i>
                {package_location}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <span className="flex-shrink-0">
                <MakkahIcon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {makkah_hotel_name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  ~{makkah_hotel_distance_m}m from Haram
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <span className="flex-shrink-0">
                <MadinaIcon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {madinah_hotel_name}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  ~{madinah_hotel_distance_m}m from Masjid
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <i className="las la-plane-departure text-base"></i>
              {departure_city} → {arrival_city}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="las la-calendar-alt text-base"></i>
              {formatDateDMY(departure_date)} – {formatDateDMY(arrival_date)}
            </span>
          </div>

          <div className="mt-auto pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-end justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                hasChecked
                sizeClass="h-9 w-9"
                radius="rounded-full"
                imgUrl={
                  getOptimizedImageUrl(profileImage, {
                    width: 80,
                    height: 80,
                    resize: 'cover',
                    quality: 70,
                  }) || undefined
                }
              />
              <div className="min-w-0">
                <Link
                  href={agentHref}
                  className="relative z-20 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:underline truncate block"
                >
                  {displayAgentName}
                </Link>
                <StartRating
                  point={agentRatingPoint}
                  reviewCount={agentReviewCount}
                  className="mt-0.5"
                />
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                From
              </p>
              <p className="whitespace-nowrap leading-tight">
                <span className="text-lg sm:text-xl font-bold text-secondary-700">
                  {displayCurrency} {displayPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                  /person
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default Packages;
