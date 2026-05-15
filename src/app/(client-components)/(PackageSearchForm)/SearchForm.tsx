'use client';

import React, { Fragment, useCallback, useEffect, useState } from 'react';
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
import { useCitySearch } from '@/hooks/useCitySearch';
import { useUserLocation } from '@/hooks/useUserLocation';
import { stripDiacritics } from '@/components/CityMultiSelect';

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
  } = usePackageSearch();

  // Local search query feeds the cities API directly. 150ms debounce
  // matches the rest of the app's city pickers — short enough to feel
  // instant, long enough to avoid firing on every keystroke.
  const [locationQuery, setLocationQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(locationQuery), 150);
    return () => clearTimeout(t);
  }, [locationQuery]);

  const { data: suggestions, isFetching: citiesLoading } = useCitySearch(debouncedQuery);

  const onPickLocation = (city: CityItem, close: () => void) => {
    handleSelectLocation(city);
    setLocationQuery('');
    close();
  };

  const { status: geoStatus, request: requestGeo, errorMessage: geoError } = useUserLocation();
  const isDetecting = geoStatus === 'requesting';

  // "Use my location" delegates to the same cities API — geocode the user's
  // position, search for a city by the detected name, take the top match.
  // No more loading the full city catalog just to match against it.
  const detectAndPick = useCallback(
    async (close: () => void) => {
      const detected = await requestGeo();
      if (!detected) {
        if (geoError) toast.error(geoError);
        return;
      }
      const queryName = (detected.city || detected.state || '').trim();
      if (!queryName) {
        toast.error('Could not figure out your city. Pick one manually.');
        return;
      }
      const params = new URLSearchParams({ q: queryName, country: 'IN', limit: '1' });
      const res = await fetch(`/api/cities/search?${params}`);
      if (!res.ok) {
        toast.error('Location lookup failed. Pick a city manually.');
        return;
      }
      const json = (await res.json()) as {
        cities?: Array<{ id: number; slug: string; name: string; admin1_name: string | null }>;
      };
      const top = json.cities?.[0];
      if (!top) {
        toast.error(`No packages near ${queryName} yet. Pick a city manually.`);
        return;
      }
      handleSelectLocation({
        id: top.id,
        name: top.name,
        state: top.admin1_name ?? undefined,
        slug: top.slug,
      });
      setLocationQuery('');
      toast.success(`Showing packages near ${stripDiacritics(top.name)}`);
      close();
    },
    [requestGeo, geoError, handleSelectLocation]
  );

  const focusLocationInput = useCallback((el: HTMLInputElement | null) => {
    if (el) requestAnimationFrame(() => el.focus());
  }, []);

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
                      disabled={isDetecting}
                      className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-900 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-60 transition-colors"
                    >
                      <MapPinIcon className="w-3.5 h-3.5" />
                      {isDetecting ? 'Detecting…' : 'Use my location'}
                    </button>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        ref={focusLocationInput}
                        type="text"
                        placeholder="Search city"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 border border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md focus:outline-none"
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
                    {debouncedQuery.length < 2 ? (
                      <p className="px-4 py-3 text-sm text-neutral-500">
                        Start typing a city (e.g. Akola).
                      </p>
                    ) : citiesLoading && (suggestions?.length ?? 0) === 0 ? (
                      <p className="px-4 py-3 text-sm text-neutral-500">Searching…</p>
                    ) : !suggestions || suggestions.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-neutral-500">
                        No location matches &ldquo;{debouncedQuery}&rdquo;.
                      </p>
                    ) : (
                      suggestions.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() =>
                            onPickLocation(
                              {
                                id: city.id,
                                name: city.name,
                                state: city.admin1_name ?? undefined,
                                slug: city.slug,
                              },
                              close
                            )
                          }
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                        >
                          <MapPinIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                          <span className="text-sm text-neutral-800 dark:text-neutral-200 truncate">
                            {stripDiacritics(city.name)}
                            {city.admin1_name ? `, ${stripDiacritics(city.admin1_name)}` : ''}
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
