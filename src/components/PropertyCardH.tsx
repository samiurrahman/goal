import React, { FC } from 'react';
import GallerySlider from '@/components/GallerySlider';
import { DEMO_STAY_LISTINGS } from '@/data/listings';
import StartRating from '@/components/StartRating';
import BtnLikeIcon from '@/components/BtnLikeIcon';
import SaleOffBadge from '@/components/SaleOffBadge';
import Badge from '@/shared/Badge';
import { StayDataType } from '@/data/types';
import Link from 'next/link';
import { Package } from '@/data/types';
import Image from 'next/image';
import { MadinaIcon, MakkahIcon } from './icons/icons';
import Avatar from '@/shared/Avatar';
import { formatPrice } from '@/utils/formatPrice';
import { m } from 'framer-motion';
export interface PropertyCardHProps {
  className?: string;
  data?: Package;
}

interface SharingRateItem {
  people: number;
  rate: number;
}

const DEMO_DATA = DEMO_STAY_LISTINGS[0];

const PropertyCardH: FC<PropertyCardHProps> = ({ className = '', data = {} as Package }) => {
  const {
    title,
    price_per_person,
    total_duration_days,
    currency,
    location,
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
    id,
  } = data as Package;

  const sharingRateArray: SharingRateItem[] = sharing_rate ? JSON.parse(sharing_rate) : [];

  const renderSliderGallery = () => {
    return (
      <div className="flex-shrink-0 p-3 w-full sm:w-64 ">
        <Image
          src={thumbnail_url || '/default-image.jpg'}
          alt={title}
          className="w-full"
          width={400}
          height={300}
          objectFit="cover"
        />

        {true && <SaleOffBadge className="absolute left-5 top-5 !bg-orange-500" />}
      </div>
    );
  };

  const renderTienIch = () => {
    return (
      <div className="flex items-center justify-start space-x-4 text-neutral-700 dark:text-neutral-300">
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-block">
            <i className="las la-calendar-week text-2xl"></i>
          </span>
          <span className="ml-1 text-sm"> {total_duration_days} Days</span>
        </div>

        {/* ---- */}
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-block">
            <MakkahIcon />
          </span>
          <span className="ml-1 text-sm max-w-[90px] truncate overflow-hidden whitespace-nowrap inline-block align-bottom">
            {makkah_hotel_name}
          </span>
          <span className="ml-1 text-sm">(~{makkah_hotel_distance_m})</span>
        </div>

        {/* ---- */}
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-block">
            <MadinaIcon />
          </span>
          <span className="ml-1.5 text-sm max-w-[90px] truncate overflow-hidden whitespace-nowrap inline-block align-bottom">
            {madinah_hotel_name}
          </span>
          <span className="ml-1 text-sm">(~{madinah_hotel_distance_m})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="hidden sm:inline-block">
            <i className="las la-plane-departure text-2xl"></i>
          </span>
          <span className="ml-1.5 text-sm">
            <span className="ml-1 text-sm">
              {' '}
              {departure_city}-{arrival_city}
            </span>
          </span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div className="flex-grow p-3 sm:pr-6 flex flex-col items-start">
        <div className="space-y-4 w-full">
          <div className="inline-flex space-x-3">
            <Badge name="Government Verified" color="green" />
            <Badge
              name={
                <div className="flex items-center">
                  <i className="text-sm las la-share-alt"></i>
                  <span className="ml-1">{sharingRateArray[0]?.people} Share</span>
                </div>
              }
            />
            {/* <Badge
              name={
                <div className="flex items-center">
                  <i className="text-sm las la-user-friends"></i>
                  <span className="ml-1">Family</span>
                </div>
              }
              color="yellow"
            /> */}
          </div>
          <div className="flex items-center space-x-2">
            {true && <Badge name="ADS" color="green" />}
            <h2 className="text-lg font-medium capitalize">
              <span className="line-clamp-2">{title}</span>
            </h2>
          </div>
          {renderTienIch()}
          <div className="w-14 border-b border-neutral-200/80 dark:border-neutral-700 "></div>
          <div className="flex w-full justify-between items-end">
            <div className="flex items-center space-x-3 ">
              <Avatar hasChecked sizeClass="h-10 w-10" radius="rounded-full" />
              <span className="ml-2.5 text-neutral-500 dark:text-neutral-400">
                <Link
                  href={`/${agent_name}/${slug}`}
                  className="text-neutral-800 dark:text-neutral-200 font-small hover:underline"
                >
                  {agent_name}
                </Link>
              </span>
              <StartRating reviewCount={12} point={4.5} />
            </div>
            <span className="flex items-center justify-center px-2.5 py-1.5 border-2 border-secondary-500 rounded-lg leading-none text-sm font-medium text-secondary-500">
              {currency}
              {formatPrice(price_per_person)}
            </span>
          </div>
          {/* <div className="flex items-center">
            <Avatar hasChecked sizeClass="h-10 w-10" radius="rounded-full" />
            <span className="ml-2.5 text-neutral-500 dark:text-neutral-400">
              Package provider{' '}
              <Link
                href={`/${agent_name}/${slug}`}
                className="text-neutral-900 dark:text-neutral-200 font-medium hover:underline"
              >
                iqra
              </Link>
            </span>
          </div> */}
        </div>
      </div>
    );
  };

  return (
    <Link
      href={`/${agent_name}/${slug}`}
      className={`nc-PropertyCardH group relative bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-3xl overflow-hidden block ${className}`}
      tabIndex={0}
      aria-label={title}
    >
      <div className="h-full w-full flex flex-col sm:flex-row sm:items-center">
        {renderSliderGallery()}
        {renderContent()}
      </div>
      <BtnLikeIcon
        colorClass={` bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 hover:bg-opacity-70 text-neutral-6000 dark:text-neutral-400`}
        isLiked={true}
        className="absolute right-5 top-5 sm:right-3 sm:top-3 "
      />
    </Link>
  );
};

export default PropertyCardH;
