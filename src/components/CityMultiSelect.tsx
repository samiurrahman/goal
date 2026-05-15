'use client';

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Checkbox from '@/shared/Checkbox';
import { useCitySearch } from '@/hooks/useCitySearch';
import { useUserLocation } from '@/hooks/useUserLocation';

export type SelectedCity = {
  id: number;
  slug: string;
  name: string;
  admin1_name: string | null;
};

export interface CityMultiSelectProps {
  selected: SelectedCity[];
  onChange: (next: SelectedCity[]) => void;
  // Render the "Use my location" pill above the search input.
  showLocationButton?: boolean;
  // Optional commit hook for "Use my location" — receives the matched city
  // and may, e.g., navigate or close a popover. Falls back to onChange when omitted.
  onPickGeolocated?: (city: SelectedCity) => void;
  searchPlaceholder?: string;
  // CSS class for the scrollable checkbox list. Defaults vary between
  // desktop popover and mobile sheet; callers tune it per layout.
  listClassName?: string;
  // When provided, the search input renders this id (helpful for <label>).
  inputId?: string;
}

// Strip combining diacritical marks (macron, acute, etc.) so GeoNames-style
// "Murtajāpur" renders as "Murtajapur" — Indian-English convention and what
// users actually type. The DB still stores the diacritic form for accurate
// matching; this is display-only.
const stripDiacritics = (s: string | null | undefined): string =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '');

const formatLabel = (c: SelectedCity): string => {
  const name = stripDiacritics(c.name);
  const state = stripDiacritics(c.admin1_name);
  return state ? `${name}, ${state}` : name;
};

/**
 * Multi-city picker with API-backed search + checkbox list.
 *
 * Shared between the desktop LocationFilter popover and the mobile filters
 * modal so behavior stays in lockstep. The component is uncontrolled-internally
 * (input + debounced query are local state) and controlled-externally (the
 * `selected` list lives in the caller, so URL hydration / Apply semantics
 * are owned by the caller — no surprise URL writes from this component).
 *
 * Behavior notes:
 *  - Already-selected cities pin to the top of the list so the user can
 *    uncheck them without re-searching.
 *  - The cities API only returns results for queries >= 2 chars. Below that
 *    we show only the staged list (or a hint when both are empty).
 *  - Diacritics in city/state names are stripped at the display layer.
 */
const CityMultiSelect: FC<CityMultiSelectProps> = ({
  selected,
  onChange,
  showLocationButton = false,
  onPickGeolocated,
  searchPlaceholder = 'Search city...',
  listClassName = 'max-h-72 overflow-y-auto space-y-3 px-1',
  inputId,
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  const { data: suggestions, isFetching } = useCitySearch(debouncedSearch);

  const displayList = useMemo<SelectedCity[]>(() => {
    const stagedIds = new Set(selected.map((c) => c.id));
    const extras = (suggestions ?? [])
      .filter((c) => !stagedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        admin1_name: c.admin1_name,
      }));
    return [...selected, ...extras];
  }, [selected, suggestions]);

  const toggleCity = useCallback(
    (checked: boolean, c: SelectedCity) => {
      if (checked) {
        if (selected.some((x) => x.id === c.id)) return;
        onChange([...selected, c]);
      } else {
        onChange(selected.filter((x) => x.id !== c.id));
      }
    },
    [selected, onChange]
  );

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
    if (onPickGeolocated) {
      onPickGeolocated(picked);
    } else if (!selected.some((c) => c.id === picked.id)) {
      onChange([...selected, picked]);
    }
    toast.success(`Showing packages near ${stripDiacritics(picked.name)}`);
  }, [requestGeo, geoError, onPickGeolocated, selected, onChange]);

  const showSearching =
    isFetching && debouncedSearch.length >= 2 && (suggestions?.length ?? 0) === 0;
  const showNoMatches =
    !isFetching &&
    debouncedSearch.length >= 2 &&
    (suggestions?.length ?? 0) === 0 &&
    selected.length === 0;
  const showHint = debouncedSearch.length < 2 && selected.length === 0;

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
      <input
        id={inputId}
        type="text"
        placeholder={searchPlaceholder}
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
        {displayList.map((item) => {
          const checked = selected.some((c) => c.id === item.id);
          return (
            <Checkbox
              key={item.id}
              name={`city-${item.id}`}
              label={formatLabel(item)}
              defaultChecked={checked}
              onChange={(isChecked) => toggleCity(isChecked, item)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CityMultiSelect;
export { stripDiacritics };
