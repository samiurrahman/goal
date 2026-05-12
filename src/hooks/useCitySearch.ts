import { useQuery, keepPreviousData } from '@tanstack/react-query';

export type CitySuggestion = {
  id: number;
  slug: string;
  name: string;
  admin1_name: string | null;
  country_code: string;
  population: number;
  similarity: number;
};

const COUNTRY = 'IN'; // Phase 1 launch scope. Drop or override when global.

/**
 * Autocomplete cities by trigram fuzzy match. Hits /api/cities/search which
 * thin-wraps the cities_autocomplete RPC. Designed for keystroke usage —
 * 250ms debounce in the caller is enough; the API caches at the edge for
 * an hour so repeat prefixes are free.
 *
 * Returns empty list for queries shorter than 2 chars (matches the API).
 */
export function useCitySearch(query: string, opts?: { enabled?: boolean }) {
  const trimmed = query.trim();
  const enabled = (opts?.enabled ?? true) && trimmed.length >= 2;

  return useQuery<CitySuggestion[], Error>({
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
    enabled,
    // Keep showing the previous results while the next query is in flight
    // so the dropdown doesn't flicker between keystrokes.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
