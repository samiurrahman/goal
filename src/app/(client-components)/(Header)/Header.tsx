'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/shared/Logo';
import NotifyDropdown from './NotifyDropdown';
import AvatarDropdown from './AvatarDropdown';
import LocationDetectBanner from '@/components/LocationDetectBanner';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { readHeaderCache } from '@/utils/headerCache';

const Header3 = () => {
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();
  const pathname = usePathname();

  const [optimisticLoggedIn, setOptimisticLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    setOptimisticLoggedIn(readHeaderCache()?.loggedIn ?? false);
  }, []);

  const showLoggedInUi = isAuthReady ? isLoggedIn : optimisticLoggedIn;

  // The location banner is only relevant on the home page (it influences the
  // packages listing the user lands on). Hiding it elsewhere keeps every
  // other page's header tight + uncluttered.
  const showLocationBanner = pathname === '/';

  // Logged-in users get notify + avatar + hamburger.
  // Logged-out users get a single prominent Sign in CTA.
  const renderActions = () => {
    if (showLoggedInUi === null) {
      return <div className="h-10 w-24" aria-hidden="true" />;
    }

    if (showLoggedInUi) {
      return (
        <div className="flex items-center gap-1 sm:gap-2">
          <NotifyDropdown />
          <AvatarDropdown />
        </div>
      );
    }

    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(pathname || '/')}`}
        className="inline-flex items-center justify-center rounded-full bg-primary-700 hover:bg-primary-800 px-5 py-2.5 sm:px-7 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-md hover:shadow-lg transition-all whitespace-nowrap"
      >
        Sign in
      </Link>
    );
  };

  return (
    <div className="nc-Header sticky top-0 w-full left-0 right-0 z-40 nc-header-bg shadow-sm dark:border-b dark:border-neutral-700">
      <div className="nc-MainNav1 relative z-10">
        {/*
          Header grows on desktop to fit the location banner. Mobile keeps the
          tight h-14 row — the banner is hidden there anyway.
        */}
        {/*
          On home (lg+) the header is locked to 88px so the location banner
          fits inside without the row collapsing when the banner returns
          null (which it does after the user grants/denies/dismisses
          location). Without a fixed height, the dropping banner would
          shrink the header and visibly jump the page on first paint.
        */}
        <div
          className={`px-4 lg:container h-14 sm:h-16 ${
            showLocationBanner ? 'lg:h-[88px]' : ''
          } relative flex justify-between items-center gap-4`}
        >
          <Logo className="w-36 sm:w-44 flex-shrink-0" />
          {showLocationBanner ? (
            <div className="hidden lg:flex flex-1 justify-center px-4 min-w-0">
              <div className="w-full max-w-2xl">
                <LocationDetectBanner />
              </div>
            </div>
          ) : null}
          <div className="text-neutral-700 dark:text-neutral-100 flex-shrink-0">
            {renderActions()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header3;
