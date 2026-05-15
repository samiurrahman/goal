import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

export type CitySuggestion = {
  id: number;
  slug: string;
  name: string;
  admin1_name: string | null;
  country_code: string;
  population: number;
  // Only present on /api/cities/search responses (trigram fuzzy match
  // returns a per-row score). The popular endpoint doesn't compute it.
  similarity?: number;
};

const COUNTRY = 'IN'; // Phase 1 launch scope. Drop or override when global.
const POPULAR_LIMIT = 300;
const LOCAL_RESULT_LIMIT = 8;

// Strip combining diacritics so "Murtajāpur" matches user-typed "murtajapur".
// Matches the display-side normalization in CityMultiSelect.
const stripDiacritics = (s: string | null | undefined): string =>
  (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '');

const norm = (s: string | null | undefined): string =>
  stripDiacritics(s).toLowerCase().trim();

/**
 * Preloads the top ~300 cities by population in the configured country.
 * Cached aggressively (30min stale, 1h gc) so this fetches once per
 * session and serves every subsequent autocomplete lookup locally.
 */
function usePopularCities() {
  return useQuery<CitySuggestion[], Error>({
    queryKey: ['popular-cities', COUNTRY],
    queryFn: async () => {
      const params = new URLSearchParams({
        country: COUNTRY,
        limit: String(POPULAR_LIMIT),
      });
      const res = await fetch(`/api/cities/popular?${params}`);
      if (!res.ok) throw new Error(`popular cities failed: ${res.status}`);
      const json = (await res.json()) as { cities?: CitySuggestion[] };
      return json.cities ?? [];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

// Local prefix/substring match over the preloaded popular list. Preserves
// population-DESC ordering (the input is already sorted) so the most
// recognizable city for a prefix floats to the top.
function filterPopular(cities: CitySuggestion[], query: string): CitySuggestion[] {
  const needle = norm(query);
  if (needle.length < 2) return [];
  const prefixHits: CitySuggestion[] = [];
  const containsHits: CitySuggestion[] = [];
  for (const c of cities) {
    const name = norm(c.name);
    const state = norm(c.admin1_name);
    if (name.startsWith(needle) || state.startsWith(needle)) {
      prefixHits.push(c);
    } else if (name.includes(needle)) {
      containsHits.push(c);
    }
    if (prefixHits.length >= LOCAL_RESULT_LIMIT) break;
  }
  return [...prefixHits, ...containsHits].slice(0, LOCAL_RESULT_LIMIT);
}

/**
 * Autocomplete cities. Tries the preloaded popular-cities list first —
 * common queries (Mumbai, Hyderabad, Akola, …) resolve with zero network.
 * Falls back to /api/cities/search (trigram fuzzy match) only when the
 * local list has no hits, so typos and niche cities still resolve.
 *
 * Returns empty list for queries shorter than 2 chars (matches the API).
 */
export function useCitySearch(query: string, opts?: { enabled?: boolean }) {
  const trimmed = query.trim();
  const baseEnabled = (opts?.enabled ?? true) && trimmed.length >= 2;

  const { data: popular } = usePopularCities();

  const localMatches = useMemo(
    () => filterPopular(popular ?? [], trimmed),
    [popular, trimmed]
  );

  // Only hit the API when the popular list can't answer. Saves a round
  // trip on the ~95% of queries that target well-known cities.
  const apiEnabled = baseEnabled && localMatches.length === 0;

  const api = useQuery<CitySuggestion[], Error>({
    queryKey: ['city-search', COUNTRY, trimmed],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: trimmed,
        country: COUNTRY,
        limit: '8',
      });
      const res = await fetch(`/api/cities/search?${params}`);
      if (!res.ok) throw new Error(`cities search failed: ${res.status}`);
      const json = (await res.json()) as { cities?: CitySuggestion[] };
      return json.cities ?? [];
    },
    enabled: apiEnabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    data: localMatches.length > 0 ? localMatches : api.data,
    isFetching: apiEnabled && api.isFetching,
  };
}
