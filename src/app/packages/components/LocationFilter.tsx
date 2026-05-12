'use client';

import React, { Fragment, useState, useMemo, useCallback } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Checkbox from '@/shared/Checkbox';
import { useCities } from '@/hooks/useCities';
import { useMultiSelectFilter } from '@/hooks/filters/useMultiSelectFilter';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import { useUserLocation } from '@/hooks/useUserLocation';
import { matchUserLocationCities } from '@/utils/matchUserLocationCities';
import XClearIcon from './XClearIcon';

type City = { id: string; name: string; state?: string | null };

const LocationFilter = () => {
  const filter = useMultiSelectFilter('location');
  const [locationSearch, setLocationSearch] = useState('');
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');
  const [hasOpened, setHasOpened] = useState(false);

  const {
    data: cities,
    error: citiesError,
    isLoading: citiesLoading,
  } = useCities({ enabled: hasOpened });

  const { status: geoStatus, request: requestGeo, errorMessage: geoError } = useUserLocation();
  const { replaceParams } = useFilterUrlSync();
  const isDetecting = geoStatus === 'requesting';

  // Write the matched cities straight to the URL via the shared sync helper.
  // We bypass filter.toggle/apply on purpose: apply() closes over a stale
  // `selected` snapshot and wouldn't pick up a same-tick setSelected call.
  // The URL write triggers useMultiSelectFilter's URL→state effect, so the
  // checkboxes reflect the selection on next render.
  const detectAndApply = useCallback(
    async (close: () => void) => {
      const detected = await requestGeo();
      if (!detected) {
        if (geoError) toast.error(geoError);
        return;
      }
      const matched = matchUserLocationCities(detected, (cities as City[] | undefined) ?? null);
      if (matched.length === 0) {
        toast.error(
          `No packages near ${detected.city || detected.state || 'your area'} yet. Pick a city manually.`
        );
        return;
      }
      replaceParams((params) => params.set('location', matched.join(',')));
      const label = detected.city || detected.state || 'your area';
      toast.success(`Showing packages near ${label}`);
      close();
    },
    [requestGeo, geoError, cities, replaceParams]
  );

  const debouncedLocationSearchUpdater = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (val: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setDebouncedLocationSearch(val), 300);
    };
  }, []);

  const filteredCities = useMemo(
    () =>
      (cities as City[] | undefined)?.filter((item) => {
        const search = debouncedLocationSearch.toLowerCase();
        return (
          item.name?.toLowerCase().includes(search) ||
          (item.state && item.state.toLowerCase().includes(search))
        );
      }) ?? [],
    [cities, debouncedLocationSearch]
  );

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            onClick={() => setHasOpened(true)}
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
             ${open ? '!border-primary-500 ' : ''}
              ${filter.isActive ? '!border-primary-500 bg-primary-50' : ''}
              `}
          >
            <span>Location</span>
            {filter.count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-[10px] font-semibold text-white">
                {filter.count}
              </span>
            )}
            {!filter.isActive ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  filter.clear();
                  setLocationSearch('');
                  setDebouncedLocationSearch('');
                }}
              >
                <XClearIcon />
              </span>
            )}
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
            <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 lg:max-w-md">
              <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-5 pt-5 pb-2">
                  <button
                    type="button"
                    onClick={() => detectAndApply(close)}
                    disabled={isDetecting || citiesLoading}
                    className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-900 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-60 transition-colors"
                  >
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {isDetecting ? 'Detecting…' : 'Use my location'}
                  </button>
                  <input
                    type="text"
                    placeholder="Search location..."
                    aria-label="Search location"
                    className="mb-3 px-3 py-2 border border-neutral-300 rounded-md w-full focus:outline-none focus:ring focus:border-primary-500"
                    value={locationSearch}
                    onChange={(e) => {
                      setLocationSearch(e.target.value);
                      debouncedLocationSearchUpdater(e.target.value);
                    }}
                  />
                </div>
                <div className="relative flex flex-col px-5 py-2 space-y-5 max-h-72 overflow-y-auto">
                  {citiesLoading && (
                    <div className="text-sm text-neutral-500">Loading locations...</div>
                  )}
                  {citiesError && (
                    <div className="text-sm text-red-500">
                      Error loading locations. Please try again.
                    </div>
                  )}
                  {!citiesLoading && !citiesError && filteredCities.length === 0 && (
                    <div className="text-sm text-neutral-500">No locations found.</div>
                  )}
                  {filteredCities.map((item) => (
                    <Checkbox
                      key={item.id}
                      name={item.name}
                      label={item.name + (item.state ? ', ' + item.state : '')}
                      defaultChecked={filter.selected.includes(item.name)}
                      onChange={(checked) => filter.toggle(checked, item.name)}
                    />
                  ))}
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      filter.clear();
                      setLocationSearch('');
                      setDebouncedLocationSearch('');
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      filter.apply();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Apply
                  </ButtonPrimary>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default LocationFilter;
