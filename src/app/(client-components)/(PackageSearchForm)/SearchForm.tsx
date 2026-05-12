'use client';

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Popover, Transition } from '@headlessui/react';
import {
  MapPinIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST_WITH_ANY } from '@/contains/contants';
import { usePackageSearch, type CityItem } from '@/hooks/usePackageSearch';
import { useUserLocation } from '@/hooks/useUserLocation';
import { matchUserLocationCities } from '@/utils/matchUserLocationCities';

// Desktop search pill that matches the HajjScanner design system wireframe:
//   - white rounded-full bar with column dividers
//   - small uppercase label + value per field
//   - circular primary search button on the right
// Two visible fields (Departure + Travel month) matching the hook's data;
// the wireframe shows four for visual reference only.
const SearchForm = () => {
  const {
    locationValue,
    handleSelectLocation,
    monthStates,
    handleChangeMonth,
    monthLabel,
    clearMonths,
    packagesUrl,
    cities,
    citiesLoading,
  } = usePackageSearch();

  const [locationQuery, setLocationQuery] = useState('');

  const filteredCities = useMemo(() => {
    if (!locationQuery) return cities;
    const q = locationQuery.toLowerCase();
    return cities.filter((c) =>
      (c.name + (c.state ? ', ' + c.state : '')).toLowerCase().includes(q)
    );
  }, [cities, locationQuery]);

  const onPickLocation = (city: CityItem, close: () => void) => {
    handleSelectLocation(city);
    setLocationQuery('');
    close();
  };

  const { status: geoStatus, request: requestGeo, errorMessage: geoError } = useUserLocation();
  const isDetecting = geoStatus === 'requesting';

  const detectAndPick = useCallback(
    async (close: () => void) => {
      const detected = await requestGeo();
      if (!detected) {
        if (geoError) toast.error(geoError);
        return;
      }
      const matched = matchUserLocationCities(
        detected,
        cities.map((c) => ({ id: String(c.id), name: c.name, state: c.state ?? null }))
      );
      if (matched.length === 0) {
        toast.error(
          `No packages near ${detected.city || detected.state || 'your area'} yet. Pick a city manually.`
        );
        return;
      }
      const cityRow = cities.find((c) => c.name === matched[0]);
      if (!cityRow) return;
      handleSelectLocation(cityRow);
      setLocationQuery('');
      toast.success(`Showing packages near ${cityRow.name}`);
      close();
    },
    [requestGeo, geoError, cities, handleSelectLocation]
  );

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      // High z-index so the popover panels (z-50 inside) always render above
      // sibling page sections like the trust bar that follows the hero.
      className="relative z-[60] w-full max-w-[980px] mx-auto bg-white dark:bg-neutral-900 rounded-full p-2 grid grid-cols-[1.4fr_1.2fr_auto] items-center gap-0"
      style={{ boxShadow: '0 24px 64px -16px rgba(17,17,26,0.30)' }}
    >
      {/* Departure field */}
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button
              className={`group w-full flex items-center gap-3 px-5 py-3.5 text-left rounded-full border-r border-neutral-200 dark:border-neutral-700 focus:outline-none hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${
                open ? 'shadow-md bg-white dark:bg-neutral-900 hover:bg-white' : ''
              }`}
            >
              <MapPinIcon className="w-5 h-5 text-primary-700 flex-shrink-0" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Location
                </span>
                <span className="text-xs font-light text-neutral-500 dark:text-neutral-400 truncate">
                  {locationValue || 'Where from?'}
                </span>
              </span>
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute z-50 left-0 top-full mt-3 w-screen max-w-md">
                <div className="overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl">
                  <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => detectAndPick(close)}
                      disabled={isDetecting || citiesLoading}
                      className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-900 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-60 transition-colors"
                    >
                      <MapPinIcon className="w-3.5 h-3.5" />
                      {isDetecting ? 'Detecting…' : 'Use my location'}
                    </button>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search city"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        autoFocus
                        className="w-full pl-9 pr-9 py-2.5 text-sm rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-400"
                      />
                      {locationQuery ? (
                        <button
                          type="button"
                          onClick={() => setLocationQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                          aria-label="Clear search"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto py-2">
                    {citiesLoading ? (
                      <p className="px-4 py-3 text-sm text-neutral-500">Loading locations…</p>
                    ) : !filteredCities || filteredCities.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-neutral-500">
                        {locationQuery
                          ? `No location matches “${locationQuery}”.`
                          : 'No locations available.'}
                      </p>
                    ) : (
                      filteredCities.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => onPickLocation(city, close)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                        >
                          <MapPinIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                          <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate">
                            {city.name}
                            {city.state ? `, ${city.state}` : ''}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>

      {/* Month field */}
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              className={`group w-full flex items-center gap-3 px-5 py-3.5 text-left rounded-full focus:outline-none hover:bg-neutral-50 dark:hover:bg-neutral-800 transition ${
                open ? 'shadow-md bg-white dark:bg-neutral-900 hover:bg-white' : ''
              }`}
            >
              <CalendarDaysIcon className="w-5 h-5 text-primary-700 flex-shrink-0" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Travel month
                </span>
                <span className="text-xs font-light text-neutral-500 dark:text-neutral-400 truncate">
                  {monthLabel || 'Any month'}
                </span>
              </span>
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute z-50 right-0 top-full mt-3 w-screen max-w-sm">
                <div className="overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl">
                  {/*
                    Height matched to the Location popover (which has a search
                    header + max-h-72 list ≈ 360px). Without this the months
                    popover renders much shorter and the two feel unbalanced.
                  */}
                  <div className="h-[22.5rem] overflow-y-auto p-3">
                    {MONTHS_LIST_WITH_ANY.map((month) => (
                      <span
                        key={`${month}-${monthStates.includes(month)}`}
                        className="flex items-center px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                      >
                        <Checkbox
                          name={month}
                          label={month}
                          defaultChecked={monthStates.includes(month)}
                          onChange={(checked) => handleChangeMonth(checked, month)}
                        />
                      </span>
                    ))}
                  </div>
                  {monthStates.length > 0 ? (
                    <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
                      <button
                        type="button"
                        onClick={clearMonths}
                        className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 underline"
                      >
                        Clear months
                      </button>
                    </div>
                  ) : null}
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>

      {/* Search button */}
      <Link
        href={packagesUrl}
        aria-label="Search packages"
        className="flex items-center justify-center w-[60px] h-[60px] rounded-full bg-primary-700 hover:bg-primary-800 text-white mx-1 transition shadow-md hover:shadow-lg"
      >
        <MagnifyingGlassIcon className="w-6 h-6" strokeWidth={2.2} />
      </Link>
    </form>
  );
};

export default SearchForm;
