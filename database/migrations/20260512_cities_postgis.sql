-- Cities lookup + PostGIS geography for proximity search.
--
-- Why: the listings page needs a "close to your search" experience — when a
-- user searches for Akola and we have no packages there, we want to surface
-- packages in nearby cities (Amravati, Nagpur). Doing this with the legacy
-- freeform `packages.package_location` text column is impossible: strings
-- carry no proximity. PostGIS + a normalized `cities` table makes the
-- "within N km of city X" query a sub-10ms GIST index lookup that scales
-- from India today to worldwide tomorrow without code changes.
--
-- This migration is additive only. Existing code paths keep working until
-- the seed script and backfill have run; nothing here drops or renames any
-- existing column.

BEGIN;

-- 1. Extensions.
--    postgis: geography(Point) + ST_DWithin/ST_Distance for proximity.
--    pg_trgm: trigram fuzzy match on city names for autocomplete typos
--             ("akol" → "Akola"). Built-in to Postgres, no install fee.
--
--    Supabase pre-installs PostGIS but the schema it lives in varies by
--    project age — newer projects use `extensions`, older ones use `public`.
--    `CREATE EXTENSION IF NOT EXISTS ... WITH SCHEMA x` is a NO-OP when the
--    extension is already installed elsewhere (it does not move the
--    extension). To stay portable we (1) install on a best-effort basis,
--    then (2) look up where postgis/pg_trgm actually ended up and add those
--    schemas to the search_path so the rest of this migration can use
--    unqualified `geography(...)`, `gin_trgm_ops`, etc.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

DO $$
DECLARE
  postgis_schema  TEXT;
  trgm_schema     TEXT;
BEGIN
  SELECT n.nspname INTO postgis_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'postgis';

  SELECT n.nspname INTO trgm_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  IF postgis_schema IS NULL THEN
    RAISE EXCEPTION 'PostGIS is not installed. Enable it in Supabase → Database → Extensions, then retry.';
  END IF;
  IF trgm_schema IS NULL THEN
    RAISE EXCEPTION 'pg_trgm is not installed. Enable it in Supabase → Database → Extensions, then retry.';
  END IF;

  -- Both schemas may be the same (e.g. both in `extensions`); the path is
  -- still valid if a name appears twice.
  EXECUTE format('SET LOCAL search_path = public, %I, %I', postgis_schema, trgm_schema);
END $$;

-- 2. cities table.
--    `geonames_id` is the upstream GeoNames primary key — seed scripts use
--    it for idempotent upserts so re-running the seed never duplicates rows
--    and the monthly refresh can ON CONFLICT cleanly.
--    `slug` is the URL-safe handle the app sends in query strings (replaces
--    the freeform `?location=Akola`).
--    `geog` is geography(Point,4326) — WGS84 lat/lng. We use geography (not
--    geometry) so ST_Distance returns metres directly and ST_DWithin
--    accepts a metre radius, no projection juggling.
--
--    The `geography` type is referenced without a schema qualifier — step 1
--    already added postgis's actual schema (whatever it is on this project)
--    to the transaction's search_path, so the name resolves regardless of
--    whether postgis lives in `extensions`, `public`, or somewhere else.
CREATE TABLE IF NOT EXISTS cities (
  id              BIGSERIAL PRIMARY KEY,
  geonames_id     BIGINT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  ascii_name      TEXT NOT NULL,
  alt_names       TEXT[] NOT NULL DEFAULT '{}',
  country_code    CHAR(2) NOT NULL,
  admin1_code     TEXT,
  admin1_name     TEXT,
  population      INTEGER NOT NULL DEFAULT 0,
  geog            GEOGRAPHY(Point, 4326) NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2a. Defensive guard against an earlier partial run that created `cities`
--     without the geog column (e.g. because `geography` didn't resolve at
--     CREATE TIME). If we got here without `geog`, the rest of the migration
--     can't proceed — surface a clear error instead of the cryptic
--     "column does not exist" from the index step.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cities'
      AND column_name = 'geog'
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'cities.geog column is missing. A previous partial run created the table without it.',
      HINT    = 'Run: DROP TABLE public.cities CASCADE; then re-run this migration.';
  END IF;
END $$;

-- 3. Indexes.
--    geog GIST: turns ST_DWithin into O(log n) — required for the proximity
--      ladder to be usable on a 30K-row India dataset and stay usable when
--      we re-seed worldwide (~200K rows).
--    ascii_name GIN trigram: powers the autocomplete fuzzy match. Without
--      this, every keystroke triggers a sequential scan.
--    country_code + population: lets autocomplete pre-filter "IN cities
--      ranked by population" in one index hit.
CREATE INDEX IF NOT EXISTS cities_geog_idx
  ON cities USING GIST (geog);

CREATE INDEX IF NOT EXISTS cities_ascii_name_trgm_idx
  ON cities USING GIN (ascii_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS cities_country_pop_idx
  ON cities (country_code, population DESC);

-- 4. updated_at trigger so monthly re-seeds carry an audit timestamp.
CREATE OR REPLACE FUNCTION cities_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cities_updated_at ON cities;
CREATE TRIGGER cities_updated_at
  BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION cities_set_updated_at();

-- 5. Link from packages → cities. Nullable for now: existing packages won't
--    have a city_id until the backfill script (Phase 1e) runs. The legacy
--    `package_location` text column stays in place so current code reading
--    `?location=...` keeps working during the transition.
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS city_id BIGINT REFERENCES cities(id);

CREATE INDEX IF NOT EXISTS packages_city_id_idx
  ON packages (city_id);

-- 6. RLS. Cities are public reference data — anyone can read, only the
--    service role (used by the seed script) can write.
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cities_read_all ON cities;
CREATE POLICY cities_read_all
  ON cities FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policy: anon and authenticated users cannot
-- write. The seed script uses the service role key which bypasses RLS.

-- 7. Helper RPC: cities_autocomplete(query, country, limit).
--    Single round trip from the /api/cities/search endpoint. The trigram
--    operator `%` uses the GIN index on ascii_name; results are ranked by
--    similarity first (closest spelling wins) and population second
--    (Akola beats a hamlet called "Akolah"). country is optional so the
--    same RPC serves the global-launch case without a code change.
CREATE OR REPLACE FUNCTION cities_autocomplete(
  p_query TEXT,
  p_country TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  id           BIGINT,
  slug         TEXT,
  name         TEXT,
  admin1_name  TEXT,
  country_code CHAR(2),
  population   INTEGER,
  similarity   REAL
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.slug,
    c.name,
    c.admin1_name,
    c.country_code,
    c.population,
    similarity(c.ascii_name, p_query) AS similarity
  FROM cities c
  WHERE c.ascii_name % p_query
    AND (p_country IS NULL OR c.country_code = p_country)
  ORDER BY similarity(c.ascii_name, p_query) DESC,
           c.population DESC
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$$;

-- 8. Helper RPC: nearby_cities(slug, radius_m). The relaxation ladder calls
--    this to expand a search beyond the user's chosen city. Returning a
--    ranked list (by distance) lets the UI show "Amravati (148 km)" labels
--    next to packages in the banner.
CREATE OR REPLACE FUNCTION nearby_cities(
  p_slug TEXT,
  p_radius_m INTEGER
)
RETURNS TABLE (
  id          BIGINT,
  slug        TEXT,
  name        TEXT,
  admin1_name TEXT,
  distance_m  INTEGER
)
LANGUAGE sql STABLE AS $$
  WITH origin AS (
    SELECT geog FROM cities WHERE slug = p_slug LIMIT 1
  )
  SELECT
    c.id,
    c.slug,
    c.name,
    c.admin1_name,
    ROUND(ST_Distance(c.geog, origin.geog))::INTEGER AS distance_m
  FROM cities c, origin
  WHERE ST_DWithin(c.geog, origin.geog, p_radius_m)
    AND c.slug <> p_slug
  ORDER BY ST_Distance(c.geog, origin.geog) ASC;
$$;

COMMIT;
