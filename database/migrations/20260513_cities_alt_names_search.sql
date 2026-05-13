-- Make the city autocomplete + backfill match against alternate names too.
--
-- Why: the first-pass backfill turned up ~71 unresolved agents, most caused
-- by two issues with the original cities_autocomplete RPC:
--
--   1. It only searched `ascii_name`. GeoNames keeps every city's
--      historical / regional names in the `alt_names` array — "Calicut"
--      for Kozhikode, "Bangalore" for Bengaluru, "Trivandrum" for
--      Thiruvananthapuram, "Mumbra" / "Mumabi" / "Mumai" as typos for
--      Mumbai, etc. Pilgrims and agents naturally type the names they
--      grew up with, not the post-rename official ones.
--
--   2. It used similarity() (whole-string trigram). For a query like
--      "Calicut" against the concatenated text "Kozhikode Calicut", the
--      score collapses to ~0.33 because the formula divides by total
--      trigram count. word_similarity() instead scores the BEST contiguous
--      substring match, so "Calicut" inside "Kozhikode Calicut" lands at
--      1.0 — exactly the behavior the agent expects.
--
-- Fix: add a generated `search_text` column that concatenates ascii_name
-- with all alt_names, GIN-trigram index it, and switch the RPC to
-- word_similarity over that column. Result: the same threshold (0.6)
-- now catches all the historic-name and typo cases.

BEGIN;

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
  IF postgis_schema IS NOT NULL AND trgm_schema IS NOT NULL THEN
    EXECUTE format('SET LOCAL search_path = public, %I, %I', postgis_schema, trgm_schema);
  END IF;
END $$;

-- 1. Immutable wrapper.
--    Postgres marks `array_to_string` as STABLE (not IMMUTABLE) out of
--    caution about element-type output functions theoretically depending
--    on locale / search_path — none of which applies to text[] of city
--    names. Generated columns and expression indexes both reject STABLE
--    functions, so we wrap the expression in our own SQL function and
--    declare it IMMUTABLE PARALLEL SAFE. This is the standard idiom for
--    the situation; the only "lie" is that we're more confident than the
--    Postgres maintainers about array_to_string for plain text[] inputs.
CREATE OR REPLACE FUNCTION cities_compute_search_text(p_name TEXT, p_alts TEXT[])
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT p_name || ' ' || COALESCE(array_to_string(p_alts, ' '), '')
$$;

-- 2. Generated column using the wrapper. STORED is the only flavor
--    Postgres supports today.
ALTER TABLE cities
  ADD COLUMN IF NOT EXISTS search_text TEXT
  GENERATED ALWAYS AS (cities_compute_search_text(ascii_name, alt_names)) STORED;

-- 3. New GIN trigram index on the broader column. Keep the old
--    ascii_name-only index in place — it's small and still useful for
--    other lookups, and dropping it would invalidate query plans live.
CREATE INDEX IF NOT EXISTS cities_search_text_trgm_idx
  ON cities USING GIN (search_text gin_trgm_ops);

-- 4. Replace the autocomplete RPC. Schema-qualified `similarity()` calls
--    are unnecessary — search_path was set at the top of this transaction.
--    Threshold of 0.3 on word_similarity catches alt-name matches without
--    too many false positives; population DESC breaks ties.
DROP FUNCTION IF EXISTS cities_autocomplete(TEXT, TEXT, INTEGER);
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
  similarity   REAL  -- column name kept for backwards compat with the script
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.slug,
    c.name,
    c.admin1_name,
    c.country_code,
    c.population,
    word_similarity(p_query, c.search_text) AS similarity
  FROM cities c
  WHERE c.search_text %> p_query
    AND (p_country IS NULL OR c.country_code = p_country)
  ORDER BY word_similarity(p_query, c.search_text) DESC,
           c.population DESC
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$$;

COMMIT;
