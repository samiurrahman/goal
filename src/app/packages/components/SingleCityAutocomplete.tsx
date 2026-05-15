'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useCitySearch } from '@/hooks/useCitySearch';
import { useUserLocation } from '@/hooks/useUserLocation';
import { stripDiacritics } from '@/components/CityMultiSelect';

export type SelectedCity = {
  id: number;
  slug: string;
  name: string;
  admin1_name: string | null;
};

interface Props {
  selected: SelectedCity | null;
  onChange: (city: SelectedCity | null) => void;
  // Optional one-click pick: receives the geolocation match so the caller can
  // commit straight to the URL + close the popover instead of waiting for Apply.
  onPickGeolocated?: (city: SelectedCity) => void;
  showLocationButton?: boolean;
  placeholder?: string;
  listClassName?: string;
}

const formatLabel = (c: SelectedCity): string => {
  const name = stripDiacritics(c.name);
  const state = stripDiacritics(c.admin1_name);
  return state ? `${name}, ${state}` : name;
};

const SingleCityAutocomplete: React.FC<Props> = ({
  selected,
  onChange,
  onPickGeolocated,
  showLocationButton = false,
  placeholder = 'Search city...',
  listClassName = 'max-h-60 overflow-y-auto',
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  const { data: suggestions, isFetching } = useCitySearch(debouncedSearch);

  const { status: geoStatus, request: requestGeo, errorMessage: geoError } = useUserLocation();
  const isDetecting = geoStatus === 'requesting';

  const detect = useCallback(async () => {
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
    const picked: SelectedCity = {
      id: top.id,
      slug: top.slug,
      name: top.name,
      admin1_name: top.admin1_name,
    };
    if (onPickGeolocated) onPickGeolocated(picked);
    else onChange(picked);
    toast.success(`Showing packages near ${stripDiacritics(picked.name)}`);
  }, [requestGeo, geoError, onPickGeolocated, onChange]);

  const showSearching =
    isFetching && debouncedSearch.length >= 2 && (suggestions?.length ?? 0) === 0;
  const showNoMatches =
    !isFetching && debouncedSearch.length >= 2 && (suggestions?.length ?? 0) === 0;
  const showHint = debouncedSearch.length < 2 && !selected;

  const pick = (city: SelectedCity) => {
    onChange(city);
    setSearch('');
    setDebouncedSearch('');
  };

  return (
    <div>
      {showLocationButton && (
        <button
          type="button"
          onClick={detect}
          disabled={isDetecting}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-900 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-60 transition-colors"
        >
          <MapPinIcon className="w-3.5 h-3.5" />
          {isDetecting ? 'Detecting…' : 'Use my location'}
        </button>
      )}
      {selected && (
        <div className="mb-3 ml-2 inline-flex items-center gap-2 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200 border border-primary-200 dark:border-primary-900 px-3 py-1 text-sm">
          <span>{formatLabel(selected)}</span>
          <button
            type="button"
            aria-label="Remove selected city"
            onClick={() => onChange(null)}
            className="-mr-1 p-0.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/40"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <input
        type="text"
        placeholder={placeholder}
        aria-label="Search city"
        autoComplete="off"
        className="mb-3 px-3 py-2 border border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 rounded-md w-full focus:outline-none"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={listClassName}>
        {showHint && (
          <p className="text-sm text-neutral-500">
            Start typing a city (e.g. Akola) to find matches.
          </p>
        )}
        {showSearching && <p className="text-sm text-neutral-500">Searching…</p>}
        {showNoMatches && (
          <p className="text-sm text-neutral-500">
            No cities match &ldquo;{debouncedSearch}&rdquo;.
          </p>
        )}
        {(suggestions ?? []).map((c) => {
          const isSelected = selected?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                pick({
                  id: c.id,
                  slug: c.slug,
                  name: c.name,
                  admin1_name: c.admin1_name,
                })
              }
              className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-200'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100'
              }`}
            >
              {formatLabel({
                id: c.id,
                slug: c.slug,
                name: c.name,
                admin1_name: c.admin1_name,
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SingleCityAutocomplete;
