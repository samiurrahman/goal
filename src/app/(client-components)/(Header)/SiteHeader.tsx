'use client';

import React, { Fragment, useEffect, useRef, useState } from 'react';
import {
  ShoppingBagIcon as ShoppingCartIcon,
  Cog8ToothIcon as CogIcon,
} from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { PathName } from '@/routers/types';
import Link from 'next/link';
import Header from './Header';
import { usePathname } from 'next/navigation';
import { useThemeMode } from '@/utils/useThemeMode';

export type SiteHeaders = 'Header 3';

interface HomePageItem {
  name: string;
  slug: PathName;
}

const SiteHeader = () => {
  useThemeMode(); 

  return (
    <>
      <Header />
      <div className="h-1 absolute invisible"></div>
    </>
  );
};

export default SiteHeader;
