import React from "react";
import Avatar from "@/shared/Avatar";
import StartRating from "@/components/StartRating";
import ButtonSecondary from "@/shared/ButtonSecondary";
import Link from "next/link";

interface HostInformationProps {
  name: string;
  places: number;
  description: string;
  joined: string;
  responseRate: string;
  responseTime: string;
  profileUrl: string;
}

const HostInformation: React.FC<HostInformationProps> = ({
  name,
  places,
  description,
  joined,
  responseRate,
  responseTime,
  profileUrl,
}) => (
  <div className="listingSection__wrap">
    <h2 className="text-2xl font-semibold">Host Information</h2>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
    <div className="flex items-center space-x-4">
      <Avatar
        hasChecked
        hasCheckedClass="w-4 h-4 -top-0.5 right-0.5"
        sizeClass="h-14 w-14"
        radius="rounded-full"
      />
      <div>
        <Link
          href={`/${profileUrl}`}
          className="block text-xl font-medium hover:underline"
        >
          {name}
        </Link>
        <div className="mt-1.5 flex items-center text-sm text-neutral-500 dark:text-neutral-400">
          <StartRating />
          <span className="mx-2">·</span>
          <span>{places} places</span>
        </div>
      </div>
    </div>
    <span className="block text-neutral-6000 dark:text-neutral-300">
      {description}
    </span>
    <div className="block text-neutral-500 dark:text-neutral-400 space-y-2.5">
      <div className="flex items-center space-x-3">
        <svg className="h-6 w-6" /* ...svg props... */>
          <path /* ... */ />
        </svg>
        <span>{joined}</span>
      </div>
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
      <ButtonSecondary href={profileUrl}>See host profile</ButtonSecondary>
    </div>
  </div>
);

export default HostInformation;
