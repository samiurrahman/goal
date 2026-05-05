'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST_WITH_ANY } from '@/contains/contants';
import { usePackageSearch, formatCityLabel } from '@/hooks/usePackageSearch';

const HeroSearchFormMobileClient = () => {
  const router = useRouter();
  const {
    locationValue,
    setLocationValue,
    handleSelectLocation,
    monthStates,
    handleChangeMonth,
    filteredCities,
    packagesUrl,
    monthLabel,
  } = usePackageSearch();

  const [showLocations, setShowLocations] = useState(false);
  const [showMonths, setShowMonths] = useState(false);

  const locationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocations(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="rounded-2xl border-2 border-primary-400 dark:border-primary-600 shadow-lg bg-white dark:bg-neutral-800 overflow-hidden">
      {/* Location */}
      <div className="relative" ref={locationRef}>
        <div
          className="flex items-center px-4 py-3.5 cursor-text border-b border-neutral-200 dark:border-neutral-700"
          onClick={() => {
            setShowLocations(true);
            setShowMonths(false);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <MagnifyingGlassIcon className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="ml-3 flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm placeholder-neutral-400 dark:placeholder-neutral-500 p-0"
            placeholder="Where would you like to go?"
            value={locationValue}
            onChange={(e) => {
              setLocationValue(e.target.value);
              setShowLocations(true);
            }}
            onFocus={() => setShowLocations(true)}
          />
        </div>

        {showLocations && filteredCities.length > 0 && (
          <div className="absolute left-0 right-0 z-30 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-b-2xl shadow-lg max-h-48 overflow-y-auto">
            {filteredCities.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left"
                onClick={() => {
                  handleSelectLocation(item);
                  setShowLocations(false);
                }}
              >
                <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span>{formatCityLabel(item)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Month selector */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3.5"
          onClick={() => {
            setShowMonths((v) => !v);
            setShowLocations(false);
          }}
        >
          <div className="flex items-center gap-3">
            <CalendarDaysIcon className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs text-neutral-400">Month</p>
              <p className="text-sm font-medium">{monthLabel || 'Any month'}</p>
            </div>
          </div>
          {showMonths ? (
            <ChevronUpIcon className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        {showMonths && (
          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
            {MONTHS_LIST_WITH_ANY.map((month) => (
              <span
                key={`${month}-${monthStates.includes(month)}`}
                className="flex items-center py-1"
              >
                <Checkbox
                  name={`mobile-${month}`}
                  label={month}
                  defaultChecked={monthStates.includes(month)}
                  onChange={(checked) => handleChangeMonth(checked, month)}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Search button */}
      <div className="p-4">
        <button
          type="button"
          onClick={() => router.push(packagesUrl)}
          className="w-full py-3 rounded-xl bg-primary-6000 hover:bg-primary-700 text-white font-semibold text-sm tracking-wide transition-colors"
        >
          SEARCH
        </button>
      </div>
    </div>
  );
};

export default HeroSearchFormMobileClient;
