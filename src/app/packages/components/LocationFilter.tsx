'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import CityAutocomplete, { SelectedCity } from '@/components/CityAutocomplete';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import { useUserLocation } from '@/hooks/useUserLocation';
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
      // Preserve the user's URL order so chips render predictably.
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

  const { status: geoStatus, request: requestGeo, errorMessage: geoError } = useUserLocation();
  const isDetecting = geoStatus === 'requesting';

  const apply = useCallback(() => {
    replaceParams((params) => {
      // Whenever we commit a structured city selection, drop the legacy
      // freeform key so they can't fight each other on the next read.
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

  const addCity = useCallback((c: SelectedCity | null) => {
    if (!c) return;
    setStagedCities((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
  }, []);

  const removeCity = useCallback((id: number) => {
    setStagedCities((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // "Use my location" — best-effort geocode → city autocomplete on the
  // detected city name → first match wins. If we can't resolve the user's
  // city to one we know about, toast a hint instead of failing silently.
  const detectAndApply = useCallback(
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
        cities?: Array<{
          id: number;
          slug: string;
          name: string;
          admin1_name: string | null;
        }>;
      };
      const top = json.cities?.[0];
      if (!top) {
        toast.error(`No packages near ${queryName} yet. Pick a city manually.`);
        return;
      }
      replaceParams((params) => {
        params.delete(LEGACY_LOCATION_PARAM);
        params.set(CITY_PARAM, top.slug);
      });
      toast.success(`Showing packages near ${top.name}`);
      close();
    },
    [requestGeo, geoError, replaceParams]
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
                <div className="px-5 pt-5 pb-2">
                  <button
                    type="button"
                    onClick={() => detectAndApply(close)}
                    disabled={isDetecting}
                    className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-900 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-60 transition-colors"
                  >
                    <MapPinIcon className="w-3.5 h-3.5" />
                    {isDetecting ? 'Detecting…' : 'Use my location'}
                  </button>
                  <CityAutocomplete
                    value={null}
                    onChange={addCity}
                    placeholder="Search a city (e.g. Akola)"
                    clearable={false}
                  />
                  {stagedCities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {stagedCities.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-100 px-2.5 py-1 text-xs font-medium"
                        >
                          {c.name}
                          {c.admin1_name ? `, ${c.admin1_name}` : ''}
                          <button
                            type="button"
                            onClick={() => removeCity(c.id)}
                            className="ml-0.5 text-primary-600 hover:text-primary-800 dark:text-primary-300"
                            aria-label={`Remove ${c.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
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
