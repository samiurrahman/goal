import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';

export type CityPackageCount = {
  city: string;
  count: number;
};

export function useCityPackageCounts(limit = 10) {
  return useQuery({
    queryKey: ['city-package-counts', limit],
    queryFn: async (): Promise<CityPackageCount[]> => {
      const { data, error } = await supabase
        .from('packages')
        .select('package_location')
        .not('package_location', 'is', null);

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ package_location: string | null }>) {
        const city = (row.package_location || '').trim();
        if (!city) continue;
        counts.set(city, (counts.get(city) ?? 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });
}
