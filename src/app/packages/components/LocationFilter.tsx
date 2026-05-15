'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import SingleCityAutocomplete, { SelectedCity } from './SingleCityAutocomplete';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import { supabase } from '@/utils/supabaseClient';
import XClearIcon from './XClearIcon';

// `?city=akola-in-mh`. Single slug now — multi-select was retired in favour
// of a typeahead. Legacy `?location=` continues to soft-resolve to a slug
// upstream in buildPackagesQueryArgs.
const CITY_PARAM = 'city';
const LEGACY_LOCATION_PARAM = 'location';

const LocationFilter = () => {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const [stagedCity, setStagedCity] = useState<SelectedCity | null>(null);

  // Take the FIRST slug only — older URLs may still carry `?city=a,b,c` from
  // when multi-select was supported. Honour the first pick so bookmarks keep
  // working, and let Apply rewrite the URL to single-slug form.
  const urlSlug = useMemo(() => {
    const raw = searchParams.get(CITY_PARAM) || '';
    return (
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? null
    );
  }, [searchParams]);

  useEffect(() => {
    if (!urlSlug) {
      setStagedCity(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, slug, name, admin1_name')
        .eq('slug', urlSlug)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setStagedCity({
        id: Number(data.id),
        slug: String(data.slug),
        name: String(data.name),
        admin1_name: data.admin1_name as string | null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [urlSlug]);

  const apply = useCallback(() => {
    replaceParams((params) => {
      params.delete(LEGACY_LOCATION_PARAM);
      if (!stagedCity) params.delete(CITY_PARAM);
      else params.set(CITY_PARAM, stagedCity.slug);
    });
  }, [stagedCity, replaceParams]);

  const clearAll = useCallback(() => {
    setStagedCity(null);
    replaceParams((params) => {
      params.delete(CITY_PARAM);
      params.delete(LEGACY_LOCATION_PARAM);
    });
  }, [replaceParams]);

  // "Use my location" picks one city → write straight to the URL and close
  // the popover. The user already expressed unambiguous intent by sharing
  // their position, so we don't make them click Apply.
  const onPickGeolocated = useCallback(
    (city: SelectedCity) => {
      replaceParams((params) => {
        params.delete(LEGACY_LOCATION_PARAM);
        params.set(CITY_PARAM, city.slug);
      });
    },
    [replaceParams]
  );

  const isActive = !!urlSlug;

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
             ${open ? '!border-primary-500 ' : ''}
              ${isActive ? '!border-primary-500 bg-primary-50' : ''}
              `}
          >
            <span>Location</span>
            {!isActive ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
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
                <div className="px-5 mt-4">
                  <SingleCityAutocomplete
                    selected={stagedCity}
                    onChange={setStagedCity}
                    showLocationButton
                    onPickGeolocated={(city) => {
                      onPickGeolocated(city);
                      close();
                    }}
                    placeholder="Search city..."
                  />
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      clearAll();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      apply();
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
