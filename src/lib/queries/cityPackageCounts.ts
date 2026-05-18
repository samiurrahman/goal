import { supabase } from '@/utils/supabaseClient';
import { SEO_CITIES } from '@/lib/seo/cities';

// Counts upcoming, published packages per SEO city slug. Returns a map keyed
// by SeoCity.urlSlug (the public URL form) so callers can look up counts
// without re-mapping dbCitySlug → urlSlug at the render site.
//
// Implementation:
//   Primary path — Postgres RPC `count_packages_by_city()` aggregates in the
//   DB and returns one row per city (~25 rows total) regardless of catalog
//   size. See migration 20260518_count_packages_by_city.sql.
//
//   Fallback path — if the RPC isn't deployed yet (e.g. fresh install before
//   migrations are applied), select package_city_slug rows and count in JS.
//   Capped at PostgREST's 1000-row default, so it WILL undercount past that
//   threshold; the fallback is for migration-not-yet-run, not for steady state.
//
// Returns an empty map on error: the homepage renders generic-copy fallback
// rather than blocking render on a count query.

type RpcRow = { city_slug: string | null; package_count: number | string | null };

// Cached at module load — once a process learns the RPC is missing, every
// subsequent homepage render in that process should go straight to the
// fallback instead of paying the round-trip + error response again.
let rpcAvailable: boolean | null = null;

export async function fetchCityPackageCounts(): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const bySlug = new Map<string, number>();

  if (rpcAvailable !== false) {
    try {
      const { data, error } = await supabase.rpc('count_packages_by_city');
      if (!error && Array.isArray(data)) {
        rpcAvailable = true;
        for (const row of data as RpcRow[]) {
          if (!row.city_slug) continue;
          const n = typeof row.package_count === 'string'
            ? parseInt(row.package_count, 10)
            : Number(row.package_count ?? 0);
          if (Number.isFinite(n) && n > 0) bySlug.set(row.city_slug, n);
        }
      } else if (error) {
        // "function not found" (PGRST202 / 42883) → mark unavailable and
        // stop probing for the lifetime of this process.
        rpcAvailable = false;
      }
    } catch {
      rpcAvailable = false;
    }
  }

  if (rpcAvailable === false) {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('packages_with_agent')
        .select('package_city_slug')
        .eq('published', true)
        .gte('departure_date', todayStr)
        .not('package_city_slug', 'is', null);
      if (!error && data) {
        for (const row of data as Array<{ package_city_slug: string | null }>) {
          const slug = row.package_city_slug;
          if (!slug) continue;
          bySlug.set(slug, (bySlug.get(slug) ?? 0) + 1);
        }
      }
    } catch {
      // swallow — caller renders generic-copy fallback
    }
  }

  for (const c of SEO_CITIES) {
    const n = bySlug.get(c.dbCitySlug) ?? 0;
    if (n > 0) result.set(c.urlSlug, n);
  }
  return result;
}
