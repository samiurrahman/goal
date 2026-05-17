'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import LocationFilter from './LocationFilter';
import AgentFilter from './AgentFilter';
import MonthFilter from './MonthFilter';
import PackageDurationFilter from './PackageDurationFilter';
import PriceFilter from './PriceFilter';
import HotelDistanceFilter from './HotelDistanceFilter';
// StopPointsFilter is intentionally not rendered: no backing column on `packages` yet.
// Re-enable once a `stops` column + filter are added.

const MobileFiltersModal = dynamic(() => import('./MobileFiltersModal'), {
  ssr: false,
  loading: () => null,
});

const TabFilters = () => {
  const [isOpenMoreFilter, setisOpenMoreFilter] = useState(false);

  return (
    <div className="flex lg:space-x-4">
      {/* FOR DESKTOP */}
      <div className="hidden lg:flex space-x-4">
        <LocationFilter />
        <AgentFilter />
        <MonthFilter />
        <PackageDurationFilter />
        <PriceFilter />
        <HotelDistanceFilter />
      </div>

      {/* FOR MOBILE / TABLET */}
      <div className="flex lg:hidden">
        <button
          type="button"
          onClick={() => setisOpenMoreFilter(true)}
          className="group inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-full border border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-100 dark:border-primary-400/80 shadow-sm shadow-primary-500/15 hover:shadow-md hover:shadow-primary-500/25 transition-[box-shadow,transform] duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          <span>Filters</span>
        </button>

        <MobileFiltersModal isOpen={isOpenMoreFilter} onClose={() => setisOpenMoreFilter(false)} />
      </div>
    </div>
  );
};

export default TabFilters;
