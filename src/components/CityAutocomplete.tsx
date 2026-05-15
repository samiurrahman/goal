'use client';

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCitySearch, CitySuggestion } from '@/hooks/useCitySearch';

export type SelectedCity = {
  id: number;
  slug: string;
  name: string;
  admin1_name: string | null;
  // ISO-3166 alpha-2 ("IN", "SA", …). Optional so existing call sites that
  // build SelectedCity from partial selects (LocationFilter, MobileFilters,
  // CityMultiSelect) keep working — country is only consumed where the
  // caller cares to read it.
  country_code?: string | null;
};

export interface CityAutocompleteProps {
  // Currently selected city (single-select). Null = nothing selected.
  value: SelectedCity | null;
  onChange: (city: SelectedCity | null) => void;
  placeholder?: string;
  // Extra Tailwind classes for the input.
  className?: string;
  // Render a "Clear" affordance inside the input when a city is selected.
  clearable?: boolean;
  // When provided, pre-fills the input with this text on first mount so the
  // user can edit-from instead of starting fresh (e.g. legacy text on URL).
  initialQuery?: string;
  inputId?: string;
}

// Single-select autocomplete. For multi-select use a wrapper that holds an
// array of SelectedCity and renders CityAutocomplete with value=null in
// "add another" mode + chips above for already-picked cities.
const CityAutocomplete: FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Search city…',
  className = '',
  clearable = true,
  initialQuery,
  inputId,
}) => {
  const [query, setQuery] = useState<string>(initialQuery ?? '');
  const [debounced, setDebounced] = useState<string>(initialQuery ?? '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display the selected city's label in the input until the user starts
  // typing. Once they edit, query takes over.
  useEffect(() => {
    if (value && !query) {
      setQuery(formatLabel(value));
      setDebounced(formatLabel(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.id]);

  // 150ms debounce — short enough to feel instant, long enough to avoid
  // firing on every keystroke. Local-cache hits in useCitySearch return
  // synchronously for popular cities, so this only gates the API fallback.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const { data: suggestions, isFetching } = useCitySearch(debounced, {
    enabled: open,
  });

  // Close on outside click. Pointerdown not click so the menu closes before
  // the click reaches a button below it.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const pick = useCallback(
    (c: CitySuggestion) => {
      const picked: SelectedCity = {
        id: c.id,
        slug: c.slug,
        name: c.name,
        admin1_name: c.admin1_name,
        country_code: c.country_code,
      };
      onChange(picked);
      setQuery(formatLabel(picked));
      setOpen(false);
    },
    [onChange]
  );

  const clear = useCallback(() => {
    onChange(null);
    setQuery('');
    setDebounced('');
    setOpen(true);
  }, [onChange]);

  const showResults = open && debounced.length >= 2;
  const showEmpty =
    showResults && !isFetching && (suggestions?.length ?? 0) === 0;

  const visibleSuggestions = useMemo(() => suggestions ?? [], [suggestions]);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        className={`w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${className}`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          // Typing invalidates the previous selection — caller is told the
          // commitment has been withdrawn (they can hold onto a "pending"
          // mirror if they want optimistic UI). Without this, a user who
          // edits then blurs without picking ends up with a stale selection.
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear selected city"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          ×
        </button>
      )}
      {showResults && (
        <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
          {isFetching && visibleSuggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-500">Searching…</div>
          )}
          {visibleSuggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:bg-primary-50 dark:focus:bg-primary-900/30 focus:outline-none"
            >
              <span className="font-medium">{c.name}</span>
              {c.admin1_name && (
                <span className="text-neutral-500 dark:text-neutral-400">
                  {' '}
                  · {c.admin1_name}
                </span>
              )}
            </button>
          ))}
          {showEmpty && (
            <div className="px-3 py-2 text-sm text-neutral-500">
              No cities match &ldquo;{debounced}&rdquo;.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function formatLabel(c: SelectedCity): string {
  return c.admin1_name ? `${c.name}, ${c.admin1_name}` : c.name;
}

export default CityAutocomplete;
