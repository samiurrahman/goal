'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import CityMultiSelect, { SelectedCity } from '@/components/CityMultiSelect';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import { supabase } from '@/utils/supabaseClient';
import XClearIcon from './XClearIcon';

// New URL contract: `?city=akola-in-mh,nagpur-in-mh` (comma-separated slugs).
// The legacy `?location=AkolaName,MumbaiName` URL still works via the
// soft-fallback resolution in buildPackagesQueryArgs — server resolves the
// text values to city_ids on the fly. Existing bookmarks keep working.
const CITY_PARAM = 'city';
const LEGACY_LOCATION_PARAM = 'location';

const LocationFilter = () => {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const [stagedCities, setStagedCities] = useState<SelectedCity[]>([]);

  // The URL is the source of truth. Hydrate stagedCities whenever it
  // changes (back/forward navigation, external links).
  const urlSlugs = useMemo(() => {
    const raw = searchParams.get(CITY_PARAM) || '';
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }, [searchParams]);

  useEffect(() => {
    if (urlSlugs.length === 0) {
      setStagedCities([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, slug, name, admin1_name')
        .in('slug', urlSlugs);
      if (cancelled || error || !data) return;
      const order = new Map(urlSlugs.map((s, i) => [s, i]));
      const next: SelectedCity[] = data
        .map((row) => ({
          id: Number(row.id),
          slug: String(row.slug),
          name: String(row.name),
          admin1_name: row.admin1_name as string | null,
        }))
        .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
      setStagedCities(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [urlSlugs]);

  const apply = useCallback(() => {
    replaceParams((params) => {
      params.delete(LEGACY_LOCATION_PARAM);
      if (stagedCities.length === 0) {
        params.delete(CITY_PARAM);
      } else {
        params.set(CITY_PARAM, stagedCities.map((c) => c.slug).join(','));
      }
    });
  }, [stagedCities, replaceParams]);

  const clearAll = useCallback(() => {
    setStagedCities([]);
    replaceParams((params) => {
      params.delete(CITY_PARAM);
      params.delete(LEGACY_LOCATION_PARAM);
    });
  }, [replaceParams]);

  // "Use my location" picks one city → write it straight to the URL and close
  // the popover. This is a different flow from manual multi-pick (which only
  // commits on Apply); the user expressed intent unambiguously by sharing
  // their position, so we don't make them click twice.
  const onPickGeolocated = useCallback(
    (city: SelectedCity) => {
      replaceParams((params) => {
        params.delete(LEGACY_LOCATION_PARAM);
        params.set(CITY_PARAM, city.slug);
      });
    },
    [replaceParams]
  );

  const isActive = urlSlugs.length > 0;

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
            {urlSlugs.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-[10px] font-semibold text-white">
                {urlSlugs.length}
              </span>
            )}
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
                <div className="px-5 pt-5">
                  <CityMultiSelect
                    selected={stagedCities}
                    onChange={setStagedCities}
                    showLocationButton
                    onPickGeolocated={(city) => {
                      onPickGeolocated(city);
                      close();
                    }}
                    searchPlaceholder="Search city..."
                  />
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
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
