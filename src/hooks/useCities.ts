import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';

// Shape kept stable for existing callers (profile page, package wizard,
// LocationInput, etc) that were written against the legacy cities catalog.
// New code should prefer `useCitySearch` (autocomplete via /api/cities/search)
// which is paginated and scales to the worldwide GeoNames dataset.
type City = {
  id: string;
  name: string;
  state?: string | null;
  slug?: string | null;
};

const FIVE_MINUTES = 5 * 60 * 1000;
const COUNTRY = 'IN'; // Phase 1 launch scope. Flip when going worldwide.

/**
 * Fetch the cities catalog. Pass `enabled: false` to defer the fetch
 * (e.g. until a filter popover is opened the first time).
 *
 * Reads from the GeoNames-seeded `cities` table. Columns are aliased so
 * callers that knew the legacy `{id, name, state}` shape keep working:
 *   - admin1_name → state (Maharashtra, Kerala, …)
 *   - id is returned as text so existing `String(city.id)` comparisons
 *     don't trip on the bigint type.
 */
function useCities(opts?: { enabled?: boolean }) {
  return useQuery<City[], Error>({
    queryKey: ['cities', COUNTRY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, admin1_name, slug')
        .eq('country_code', COUNTRY)
        .order('population', { ascending: false })
        .limit(10000);
      if (error) throw error;
      return ((data ?? []) as Array<{
        id: number | string;
        name: string;
        admin1_name: string | null;
        slug: string;
      }>).map((row) => ({
        id: String(row.id),
        // GeoNames seeds names with diacritics (Morādābād, Mīthepur, Mughal Sarāi).
        // Strip combining marks so the picker shows the spellings agents actually
        // expect to read and select.
        name: row.name.normalize('NFD').replace(/\p{Diacritic}/gu, ''),
        state: row.admin1_name,
        slug: row.slug,
      }));
    },
    enabled: opts?.enabled ?? true,
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES * 2,
  });
}
export { useCities };
export type { City };
