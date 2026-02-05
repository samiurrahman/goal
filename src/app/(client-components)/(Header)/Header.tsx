'use client';

import React, { FC, useEffect, useRef, useState } from 'react';
import Logo from '@/shared/Logo';
import useOutsideAlerter from '@/hooks/useOutsideAlerter';
import NotifyDropdown from './NotifyDropdown';
import AvatarDropdown from './AvatarDropdown';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import Link from 'next/link';
import HeroSearchForm2Mobile from '../(HeroSearchForm2Mobile)/HeroSearchForm2Mobile';
import ButtonPrimary from '@/shared/ButtonPrimary';

const Header3 = () => {  //
  
  const isLoggedIn = useSupabaseIsLoggedIn();
  return (
    <>
    <div className={`nc-Header sticky top-0 w-full left-0 right-0 z-40 nc-header-bg`}>
        <div className={`nc-MainNav1 relative z-10`}>
          <div className="px-4 lg:container h-20 relative flex justify-between">
            <div className="hidden md:flex justify-start flex-1 space-x-4 sm:space-x-10">
              <Logo className="w-24 self-center" />
            </div>

            <div className="flex lg:hidden flex-[3] max-w-lg !mx-auto md:px-3 ">
              <div className="self-center flex-1">
               <HeroSearchForm2Mobile />
              </div>
            </div>

             <div className="hidden md:flex relative z-10 flex-1 justify-end text-neutral-700 dark:text-neutral-100">
              <div className=" flex space-x-1">
                <Link
                  href={'/add-listing/1'}
                  className="self-center hidden xl:inline-flex px-4 py-2 border border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 rounded-full items-center text-sm text-gray-700 dark:text-neutral-300 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
                >
                  Offers
                </Link>

                {/* {isLoggedIn && <NotifyDropdown />}
                {isLoggedIn && <AvatarDropdown />} */}
                {isLoggedIn ? <> <NotifyDropdown /><AvatarDropdown /></> : <><div className="px-1" />
                <ButtonPrimary className="self-center" href="/login">
                  log in
                </ButtonPrimary></>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header3;
