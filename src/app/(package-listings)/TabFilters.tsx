'use client';

import React, { useState } from 'react';
import LocationFilter from './components/LocationFilter';
import AgentFilter from './components/AgentFilter';
import MonthFilter from './components/MonthFilter';
import PackageDurationFilter from './components/PackageDurationFilter';
import PriceFilter from './components/PriceFilter';
import HotelDistanceFilter from './components/HotelDistanceFilter';
import StopPointsFilter from './components/StopPointsFilter';
import MobileFiltersModal from './components/MobileFiltersModal';

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
        <StopPointsFilter />
      </div>

      {/* FOR MOBILE / TABLET */}
      <div className="flex lg:hidden">
        <button
          onClick={() => setisOpenMoreFilter(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-700 focus:outline-none active:scale-95 transition-transform"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
            />
          </svg>
          <span>Filters</span>
        </button>

        <MobileFiltersModal isOpen={isOpenMoreFilter} onClose={() => setisOpenMoreFilter(false)} />
      </div>
    </div>
  );
};

export default TabFilters;
