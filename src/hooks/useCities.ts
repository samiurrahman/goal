import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';

type City = { id: string; name: string; state?: string | null };

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Fetch the cities catalog. Pass `enabled: false` to defer the fetch
 * (e.g. until a filter popover is opened the first time).
 */
function useCities(opts?: { enabled?: boolean }) {
  return useQuery<City[], Error>({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cities').select('id, name, state');
      if (error) throw error;
      return (data ?? []) as City[];
    },
    enabled: opts?.enabled ?? true,
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES * 2,
  });
}
export { useCities };
