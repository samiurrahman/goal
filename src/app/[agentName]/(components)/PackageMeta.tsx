import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Avatar from '@/shared/Avatar';
import StartRating from '@/components/StartRating';
import GovtVerifiedBadge from '@/components/GovtVerifiedBadge';
import ShareButton from '@/shared/ShareButton';
import { MakkahIcon, MadinaIcon } from '@/components/icons/icons';
import { getOptimizedImageUrl } from '@/lib/imageUrl';
import { sanitizePackageTags, packageTagTone } from '@/constants/packageTags';

const FALLBACK_BLUR_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgD//Z';

const formatDateDMY = (dateInput?: string | Date) => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export interface PackageMetaProps {
  title: string;
  thumbnailUrl?: string | null;
  thumbnailBlur?: string | null;
  totalDurationDays?: number | null;
  sharingPeople?: number;
  packageLocation?: string;
  makkahHotelName?: string;
  makkahHotelDistanceM?: number | null;
  madinahHotelName?: string;
  madinahHotelDistanceM?: number | null;
  departureCity?: string;
  arrivalCity?: string;
  departureDate?: string;
  arrivalDate?: string;
  agentSlug: string;
  agentDisplayName: string;
  agentProfileImage?: string | null;
  agentRatingPoint?: number;
  agentReviewCount?: number;
  shareUrl?: string;
  tags?: string[] | null;
}

const PackageMeta: React.FC<PackageMetaProps> = ({
  title,
  thumbnailUrl,
  thumbnailBlur,
  totalDurationDays,
  sharingPeople,
  packageLocation,
  makkahHotelName,
  makkahHotelDistanceM,
  madinahHotelName,
  madinahHotelDistanceM,
  departureCity,
  arrivalCity,
  departureDate,
  arrivalDate,
  agentSlug,
  agentDisplayName,
  agentProfileImage,
  agentRatingPoint = 0,
  agentReviewCount = 0,
  shareUrl,
  tags,
}) => {
  const sanitizedTags = sanitizePackageTags(tags);
  return (
    <article className="nc-PackageMeta group relative bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex flex-col">
        {/* Hero image */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <Image
            src={
              getOptimizedImageUrl(thumbnailUrl, {
                width: 1200,
                height: 675,
                resize: 'cover',
                quality: 80,
              }) || '/default-image.jpg'
            }
            alt={title || 'Package image'}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 800px"
            quality={80}
            priority
            placeholder="blur"
            blurDataURL={thumbnailBlur || FALLBACK_BLUR_DATA_URL}
          />

          <div className="absolute left-3 top-3">
            <GovtVerifiedBadge />
          </div>

          {shareUrl ? (
            <div className="absolute right-3 top-3">
              <ShareButton
                url={shareUrl}
                title={title}
                iconOnly
                className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm shadow-sm"
                ariaLabel="Share package"
              />
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <h1 className="text-xl sm:text-2xl font-semibold capitalize leading-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </h1>

          {/* Quick meta pills */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-neutral-600 dark:text-neutral-300">
            {totalDurationDays != null && (
              <span className="inline-flex items-center gap-1.5">
                <i className="las la-clock text-base"></i>
                {totalDurationDays} Days
              </span>
            )}
            {sharingPeople != null && (
              <span className="inline-flex items-center gap-1.5">
                <i className="las la-share-alt text-base"></i>
                {sharingPeople} Sharing
              </span>
            )}
            {packageLocation && (
              <span className="inline-flex items-center gap-1.5">
                <i className="las la-map-marker text-base"></i>
                {packageLocation}
              </span>
            )}
          </div>

          {/* Hotels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <span className="flex-shrink-0">
                <MakkahIcon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {makkahHotelName || 'Makkah Hotel'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {makkahHotelDistanceM != null
                    ? `~${makkahHotelDistanceM}m from Haram`
                    : 'Distance from Haram TBD'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <span className="flex-shrink-0">
                <MadinaIcon />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {madinahHotelName || 'Madina Hotel'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {madinahHotelDistanceM != null
                    ? `~${madinahHotelDistanceM}m from Masjid`
                    : 'Distance from Masjid TBD'}
                </p>
              </div>
            </div>
          </div>

          {/* Travel route + dates */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <i className="las la-plane-departure text-base"></i>
              {departureCity || 'TBD'} → {arrivalCity || 'TBD'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="las la-calendar-alt text-base"></i>
              {formatDateDMY(departureDate) || 'TBD'} – {formatDateDMY(arrivalDate) || 'TBD'}
            </span>
          </div>

          {/* Agent footer */}
          <div className="mt-auto pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
            <Avatar
              hasChecked
              sizeClass="h-10 w-10"
              radius="rounded-full"
              imgUrl={
                getOptimizedImageUrl(agentProfileImage, {
                  width: 96,
                  height: 96,
                  resize: 'cover',
                  quality: 75,
                }) || undefined
              }
            />
            <div className="min-w-0 flex-grow">
              <Link
                href={`/${agentSlug}`}
                className="text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:underline truncate block"
              >
                {agentDisplayName}
              </Link>
              <StartRating
                point={agentRatingPoint}
                reviewCount={agentReviewCount}
                className="mt-0.5"
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PackageMeta;
