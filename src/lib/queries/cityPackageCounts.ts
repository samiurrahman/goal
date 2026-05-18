import { supabase } from '@/utils/supabaseClient';
import { SEO_CITIES } from '@/lib/seo/cities';

// Counts upcoming, published packages per SEO city slug. Returns a map keyed
// by SeoCity.urlSlug (the public URL form) so callers can look up counts
// without re-mapping dbCitySlug → urlSlug at the render site.
//
// Implementation: a single SELECT of package_city_slug for all published,
// future-dated packages, counted in JS. With package_city_slug constrained
// to the cities table (~25 SEO cities + a long tail), the row count stays
// modest — cheaper than 25 parallel HEAD counts and one round trip.
//
// Returns an empty map on error: the homepage falls back to generic copy
// rather than blocking render on a count query.
export async function fetchCityPackageCounts(): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('packages_with_agent')
      .select('package_city_slug')
      .eq('published', true)
      .gte('departure_date', todayStr)
      .not('package_city_slug', 'is', null);

    if (error || !data) return result;

    const bySlug = new Map<string, number>();
    for (const row of data as Array<{ package_city_slug: string | null }>) {
      const slug = row.package_city_slug;
      if (!slug) continue;
      bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
    }

    for (const c of SEO_CITIES) {
      const n = bySlug.get(c.dbCitySlug) ?? 0;
      if (n > 0) result.set(c.urlSlug, n);
    }
  } catch {
    // swallow — caller renders the generic-copy fallback
  }
  return result;
}
