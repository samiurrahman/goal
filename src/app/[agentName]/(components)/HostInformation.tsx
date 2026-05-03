import React from 'react';
import Avatar from '@/shared/Avatar';
import StartRating from '@/components/StartRating';
import ButtonSecondary from '@/shared/ButtonSecondary';
import Link from 'next/link';

interface HostInformationProps {
  name: string;
  places: number;
  ratingPoint?: number;
  reviewCount?: number;
  description: string;
  descriptionHtml?: string;
  joined: string;
  location?: string;
  responseRate: string;
  responseTime: string;
  profileUrl: string;
  profileImage?: string | null;
}

const sanitizeMarkup = (markup: string) => {
  if (!markup) return '';
  return markup
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');
};

const HostInformation: React.FC<HostInformationProps> = ({
  name,
  places,
  ratingPoint = 0,
  reviewCount = 0,
  description,
  descriptionHtml,
  joined,
  location,
  responseRate,
  responseTime,
  profileUrl,
  profileImage,
}) => {
  const normalizedProfileHref = profileUrl.startsWith('/') ? profileUrl : `/${profileUrl}`;

  return (
    <div className="listingSection__wrap !space-y-4">
      <h2 className="text-xl font-normal text-gray-900">Host Information</h2>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      <div className="flex items-center space-x-4">
        <Avatar
          hasChecked
          hasCheckedClass="w-4 h-4 -top-0.5 right-0.5"
          sizeClass="h-14 w-14"
          radius="rounded-full"
          imgUrl={profileImage || undefined}
        />
        <div>
          <Link href={normalizedProfileHref} className="block text-md font-medium hover:underline">
            {name}
          </Link>
          <div className="mt-1.5 flex items-center text-sm text-neutral-500 dark:text-neutral-400">
            <StartRating point={ratingPoint} reviewCount={reviewCount} />
          </div>
        </div>
      </div>
      {descriptionHtml ? (
        <div
          className="prose prose-sm max-w-none text-neutral-700 dark:prose-invert dark:text-neutral-300 prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: sanitizeMarkup(descriptionHtml) }}
        />
      ) : (
        <p className="block text-neutral-600 dark:text-neutral-300 text-sm whitespace-pre-wrap">
          {description}
        </p>
      )}
      <div className="block text-neutral-500 dark:text-neutral-400 gap-3 text-sm">
        <div className="flex items-center space-x-3">
          <svg className="h-6 w-6" /* ...svg props... */>
            <path /* ... */ />
          </svg>
          <span>{joined}</span>
        </div>
        {location ? (
          <div className="flex items-center space-x-3">
            <svg className="h-6 w-6" /* ...svg props... */>
              <path /* ... */ />
            </svg>
            <span>Location - {location}</span>
          </div>
        ) : null}
        <div className="flex items-center space-x-3">
          <svg className="h-6 w-6" /* ...svg props... */>
            <path /* ... */ />
          </svg>
          <span>Response rate - {responseRate}</span>
        </div>
        <div className="flex items-center space-x-3">
          <svg className="h-6 w-6" /* ...svg props... */>
            <path /* ... */ />
          </svg>
          <span>{responseTime}</span>
        </div>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      <div>
        <ButtonSecondary href={normalizedProfileHref}>See host profile</ButtonSecondary>
      </div>
    </div>
  );
};

export default HostInformation;
