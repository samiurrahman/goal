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
}) => {
  return (
    <div className="listingSection__wrap !space-y-6">
      {/* Heading */}
      <h2 className="text-2xl sm:text-2xl lg:text-2xl font-semibold">{title}</h2>
      {/* Meta Row */}
      <div className="flex items-center justify-between xl:justify-start space-x-6 xl:space-x-6 text-sm text-neutral-700 dark:text-neutral-300">
        <div className="flex items-center space-x-3 ">
          <span className="flex items-center">
            <i className="las la-calendar-week text-2xl"></i>
            <span className="ml-1 text-sm"> {duration} </span>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <MakkahIcon />
            <span className="ml-1 text-sm"> {madinaHotel}</span>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <MadinaIcon />
            <span className="ml-1 text-sm"> {makkahHotel}</span>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <i className="las la-plane-departure text-2xl"></i>
            <span className="ml-1 text-sm"> {route}</span>
          </span>
        </div>
      </div>
      {/* Divider */}
      <div className="w-full border-b border-neutral-100 dark:border-neutral-700" />
      {/* Provider Info */}
      <div className="flex items-center">
        <Avatar hasChecked sizeClass="h-10 w-10" radius="rounded-full" />
        <span className="ml-2.5 text-neutral-500 dark:text-neutral-400">
          Package provider{' '}
          <Link
            href={`/${url}`}
            className="text-neutral-900 dark:text-neutral-200 font-medium hover:underline"
          >
            {provider}
          </Link>
          {providerVerified && <Badge name="Government Verified" color="green" />}
        </span>
      </div>
      {/* Location & Rating */}
      <div className="flex items-center space-x-4">
        <StartRating />
        <span>·</span>
        <span>
          <i className="las la-map-marker-alt"></i>
          <span className="ml-1"> {providerLocation}</span>
        </span>
      </div>
    </div>
  );
};

export default PackageMeta;
