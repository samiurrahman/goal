'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/shared/Logo';
import NotifyDropdown from './NotifyDropdown';
import AvatarDropdown from './AvatarDropdown';
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
        className="inline-flex items-center justify-center rounded-full bg-primary-700 hover:bg-primary-800 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-normal text-white shadow-md hover:shadow-lg transition-all whitespace-nowrap"
      >
        Sign in
      </Link>
    );
  };

  return (
    <div className="nc-Header sticky top-0 w-full left-0 right-0 z-40 nc-header-bg shadow-sm dark:border-b dark:border-neutral-700">
      <div className="nc-MainNav1 relative z-10">
        <div className="px-4 lg:container h-14 sm:h-16 relative flex justify-between items-center gap-4">
          <Logo className="w-36 sm:w-44 flex-shrink-0" />
          <div className="text-neutral-700 dark:text-neutral-100 flex-shrink-0">
            {renderActions()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header3;
