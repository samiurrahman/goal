-- RPC: count_packages_by_city()
--
-- Returns one row per city slug that currently has at least one upcoming
-- published package, with the count. Used by the homepage's "Umrah packages
-- from your city" grid to render counts beside each city card.
--
-- Why an RPC instead of selecting rows in JS:
--   The old client-side counter selected every package_city_slug column for
--   every upcoming published package and counted in JS. That worked at low
--   volume, but (a) PostgREST defaults to a 1000-row cap so the count
--   silently undercounts past that, and (b) response size grows linearly
--   with the package catalog. This RPC does the aggregation in Postgres
--   and returns ~25 rows regardless of catalog size — accurate at any scale,
--   ~zero data transfer.
--
-- SECURITY DEFINER is deliberately omitted: the function reads from the
-- `packages_with_agent` view which already filters via RLS / view conditions.
-- Callers see only rows they're allowed to see, same as a direct SELECT.
--
-- STABLE because the function does not modify the database and returns the
-- same result within a single statement (lets the planner cache it across
-- joins / repeated calls in the same query).
--
-- Marked PARALLEL SAFE so PG can parallelize the underlying aggregate scan.

BEGIN;

CREATE OR REPLACE FUNCTION public.count_packages_by_city()
RETURNS TABLE (city_slug text, package_count bigint)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT package_city_slug AS city_slug, COUNT(*) AS package_count
  FROM public.packages_with_agent
  WHERE published = true
    AND departure_date >= CURRENT_DATE
    AND package_city_slug IS NOT NULL
  GROUP BY package_city_slug;
$$;

-- Anon role needs EXECUTE to call this from the public homepage (no auth).
-- Authenticated role gets it too for parity (some downstream features might
-- want city counts in account-area views).
GRANT EXECUTE ON FUNCTION public.count_packages_by_city() TO anon, authenticated;

COMMIT;
