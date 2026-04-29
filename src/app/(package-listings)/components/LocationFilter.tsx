'use client';

import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Checkbox from '@/shared/Checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCities } from '@/hooks/useCities';
import XClearIcon from './XClearIcon';

type City = { id: string; name: string; state?: string };

const LocationFilter = () => {
  const [locationStates, setLocationStates] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: cities, error: citiesError, isLoading: citiesLoading } = useCities();

  useEffect(() => {
    const urlLocation = searchParams.get('location');
    if (urlLocation) {
      setLocationStates(urlLocation.split(','));
    } else {
      setLocationStates([]);
    }
  }, [searchParams]);

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

  const handleChangeLocation = (checked: boolean, name: string) => {
    if (checked) {
      setLocationStates((prev) => [...prev, name]);
    } else {
      setLocationStates((prev) => prev.filter((i) => i !== name));
    }
  };

  const handleApplyLocation = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (locationStates.length > 0) {
      params.set('location', locationStates.join(','));
    } else {
      params.delete('location');
    }
    router.replace(window.location.pathname + '?' + params.toString());
  };

  const handleClearLocationFilter = () => {
    setLocationStates([]);
    setLocationSearch('');
    setDebouncedLocationSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('location');
    router.replace(window.location.pathname + '?' + params.toString());
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
             ${open ? '!border-primary-500 ' : ''}
              ${!!locationStates.length ? '!border-primary-500 bg-primary-50' : ''}
              `}
          >
            <span>Location</span>
            {!locationStates.length ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearLocationFilter();
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
                <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-5 pt-6 pb-2">
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
                      defaultChecked={locationStates.includes(item.name)}
                      onChange={(checked) => handleChangeLocation(checked, item.name)}
                    />
                  ))}
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      handleClearLocationFilter();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      handleApplyLocation();
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
