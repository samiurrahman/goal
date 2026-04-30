import React from 'react';
import Avatar from '@/shared/Avatar';
import Badge from '@/shared/Badge';
import StartRating from '@/components/StartRating';
import { MakkahIcon, MadinaIcon } from '@/components/icons/icons';
import Link from 'next/link';

export interface PackageMetaProps {
  title: string;
  duration: string;
  makkahHotel: string;
  madinaHotel: string;
  route: string;
  provider: string;
  providerVerified?: boolean;
  providerLocation: string;
  url: string;
  dates?: string;
}

const PackageMeta: React.FC<PackageMetaProps> = ({
  title,
  duration,
  makkahHotel,
  madinaHotel,
  route,
  provider,
  providerVerified = true,
  providerLocation,
  url,
  dates,
}) => {
  return (
    <div className="listingSection__wrap !space-y-4">
      <h1 className="text-2xl font-normal text-gray-900">{title}</h1>
      <div className="inline-flex space-x-3">
        <Badge
          name={
            <div className="flex items-center">
              <i className="text-sm las la-clock"></i>
              <span className="ml-1">{duration}</span>
            </div>
          }
        />
        <Badge
          name={
            <div className="flex items-center">
              <i className="text-sm las la-map-marker"></i>
              <span className="ml-1">{providerLocation}</span>
            </div>
          }
        />

        <Badge
          name={
            <div className="flex items-center">
              <i className="text-sm las la-share-alt"></i>
              <span className="ml-1">5 Sharing</span>
            </div>
          }
        />
      </div>

      <div className="w-full border-b border-neutral-100 dark:border-neutral-700" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="flex items-start gap-4">
          <i className="text-3xl las la-kaaba flex-shrink-0 mt-0.5"></i>
          <div className="flex-1">
            <p className="text-xs text-gray-600">Makkah Hotels</p>
            <span className="text-sm text-gray-900 font-medium">{makkahHotel}</span>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <i className="text-3xl las la-mosque flex-shrink-0 mt-0.5"></i>
          <div className="flex-1">
            <p className="text-xs text-gray-600">Madina Hotels</p>
            <span className="text-sm text-gray-900 font-medium">{madinaHotel}</span>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <i className="text-3xl las la-city flex-shrink-0 mt-0.5"></i>
          <div className="flex-1">
            <p className="text-xs text-gray-600">Makkah and Madina Days</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 font-medium">5 Days -</span>
              <span className="text-sm text-gray-900 font-medium">4 Days</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <i className="las la-plane-departure text-2xl flex-shrink-0 mt-0.5"></i>
          <div className="flex-1">
            <p className="text-xs text-gray-600">Flight Departure & Arrival Details</p>
            <p className="text-sm text-gray-900 font-medium">{route}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <i className="las la-calendar-week text-2xl flex-shrink-0 mt-0.5"></i>
          <div className="flex-1">
            <p className="text-xs text-gray-600">Package Start & End Dates</p>
            <p className="text-sm text-gray-900 font-medium">{dates}</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <i className="las la-bell text-2xl flex-shrink-0 mt-0.5"></i>
          <div className="flex-1">
            <p className="text-xs text-gray-600">Free cancellation before 10 days of departure</p>
            <p className="text-sm text-gray-900 font-medium">
              Get a full refund if you change your mind.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full border-b border-neutral-100 dark:border-neutral-700" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 my-4">
        <div className="flex items-center">
          <Avatar hasChecked sizeClass="h-10 w-10" radius="rounded-full" />
          <span className="ml-2.5 text-neutral-500 dark:text-neutral-400">
            <Link
              href={`/${url}`}
              className="text-neutral-900 dark:text-neutral-200 font-medium hover:underline"
            >
              {provider}
            </Link>
            {providerVerified && <Badge name="Government Verified" color="green" />}
          </span>
        </div>
        <div className="flex items-center">
          <div className="flex items-center space-x-4">
            <StartRating />
            <span>·</span>
            <span>
              <i className="las la-map-marker-alt"></i>
              <span className="ml-1 text-neutral-500 dark:text-neutral-400">
                {' '}
                {providerLocation}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageMeta;
