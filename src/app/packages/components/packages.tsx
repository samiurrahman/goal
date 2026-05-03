'use client';
import React, { FC, useMemo } from 'react';
import StartRating from '@/components/StartRating';
import BtnLikeIcon from '@/components/BtnLikeIcon';
import SaleOffBadge from '@/components/SaleOffBadge';
import Badge from '@/shared/Badge';
import { Package } from '@/data/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MadinaIcon, MakkahIcon } from '@/components/icons/icons';
import Avatar from '@/shared/Avatar';

type SharingRateItem = { value: string; people: number; default: boolean };

export interface PackagesProps {
  className?: string;
  data?: Package;
  agentProfileImage?: string | null;
  agentDisplayName?: string;
  agentSlug?: string;
}

const Packages: FC<PackagesProps> = ({
  className = '',
  data = {} as Package,
  agentProfileImage,
  agentDisplayName,
  agentSlug,
}) => {
  const router = useRouter();
  const profileImage =
    agentProfileImage || (data as Package & { profile_image?: string | null }).profile_image;
  const {
    title,
    price_per_person,
    total_duration_days,
    currency,
    thumbnail_url,
    slug,
    agent_name,
    makkah_hotel_name,
    madinah_hotel_name,
    makkah_hotel_distance_m,
    madinah_hotel_distance_m,
    departure_city,
    arrival_city,
    sharing_rate,
    departure_date,
    arrival_date,
    package_location,
  } = data;

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
    <div
      className={`lg:px-2 lg:py-1 shadow-sm nc-PropertyCardH group relative bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-3xl overflow-hidden block cursor-pointer ${className}`}
      role="link"
      tabIndex={0}
      aria-label={title}
      onClick={() => router.push(packageHref)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(packageHref);
        }
      }}
    >
      <div className="h-full w-full flex flex-col sm:flex-row sm:items-center">
        <div className="flex-shrink-0 p-3 w-full sm:w-64">
          <div className="w-full rounded-2xl bg-neutral-50 dark:bg-neutral-800 p-2">
            <Image
              src={thumbnail_url || '/default-image.jpg'}
              alt={title || 'Package image'}
              className="w-full rounded-xl"
              width={400}
              height={300}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <SaleOffBadge className="absolute left-5 top-5 !bg-orange-500" />
        </div>

        <div className="flex-grow p-3 sm:pr-6 flex flex-col items-start">
          <div className="space-y-4 w-full">
            <div className="inline-flex space-x-3">
              <Badge name="Government Verified" color="green" />
              <Badge
                name={
                  <div className="flex items-center">
                    <i className="text-sm las la-share-alt"></i>
                    <span className="ml-1">{defaultSharingRate?.people} Share</span>
                  </div>
                }
              />
              <Badge
                name={
                  <div className="flex items-center">
                    <i className="text-sm las la-clock"></i>
                    <span className="ml-1">{total_duration_days} Days</span>
                  </div>
                }
              />
              <Badge
                name={
                  <div className="flex items-center">
                    <i className="text-sm las la-map-marker"></i>
                    <span className="ml-1">{package_location}</span>
                  </div>
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Badge name="ADS" color="green" />
              <h2 className="text-lg font-medium capitalize">
                <span className="line-clamp-2">{title}</span>
              </h2>
            </div>

            <div className="flex items-center justify-start space-x-4 text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center">
                <span className="hidden sm:inline-block">
                  <MakkahIcon />
                </span>
                <span className="ml-1 text-sm max-w-[90px] truncate overflow-hidden whitespace-nowrap inline-block align-bottom">
                  {makkah_hotel_name}
                </span>
                <span className="ml-1 text-sm">(~{makkah_hotel_distance_m}m)</span>
              </div>

              <div className="flex items-center">
                <span className="hidden sm:inline-block">
                  <MadinaIcon />
                </span>
                <span className="ml-1.5 text-sm max-w-[90px] truncate overflow-hidden whitespace-nowrap inline-block align-bottom">
                  {madinah_hotel_name}
                </span>
                <span className="ml-1 text-sm">(~{madinah_hotel_distance_m}m)</span>
              </div>

              <div className="flex items-center">
                <span className="hidden sm:inline-block">
                  <i className="las la-plane-departure text-2xl"></i>
                </span>
                <span className="ml-1.5 text-sm">
                  <span className="ml-1 text-sm">
                    {departure_city} - {arrival_city}
                  </span>
                </span>
              </div>

              <div className="flex items-center">
                <span className="hidden sm:inline-block">
                  <i className="las la-calendar-alt text-2xl"></i>
                </span>
                <span className="ml-1.5 text-sm">
                  <span className="ml-1 text-sm">
                    {formatDateDMY(departure_date)} - {formatDateDMY(arrival_date)}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex w-full justify-between items-end">
              <div className="flex items-center space-x-3">
                <Avatar
                  hasChecked
                  sizeClass="h-10 w-10"
                  radius="rounded-full"
                  imgUrl={profileImage || undefined}
                />
                <span className="ml-2.5 text-neutral-500 dark:text-neutral-400">
                  <Link
                    href={agentHref}
                    className="text-neutral-800 dark:text-neutral-200 font-small hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {displayAgentName}
                  </Link>
                </span>
                <StartRating reviewCount={12} point={4.5} />
              </div>

              <span className="text-lg font-semibold text-secondary-700">
                {currency} {price_per_person}
                <span className="text-sm text-neutral-500 dark:text-neutral-400 font-normal">
                  /Person
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <BtnLikeIcon
        colorClass=" bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 hover:bg-opacity-70 text-neutral-6000 dark:text-neutral-400"
        isLiked={true}
        className="absolute right-5 top-5 sm:right-3 sm:top-3"
      />
    </div>
  );
};

export default Packages;
