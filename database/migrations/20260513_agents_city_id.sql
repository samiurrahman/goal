-- Link agents to the cities catalog, and surface the structured city data
-- through packages_with_agent so the listings filter can match by city slug
-- and the relaxation ladder can do PostGIS proximity expansions.
--
-- Existing world before this migration:
--   - agents.city / agents.state were freeform text written by the agent in
--     their profile form.
--   - packages_with_agent.package_location was aliased from agents.city.
--   - The listings filter was an `ilike '%text%'` on package_location.
--
-- After this migration:
--   - agents gains city_id (BIGINT FK → cities.id), set by the profile form
--     when the agent picks from the new city autocomplete.
--   - The legacy agents.city / agents.state text columns stay populated
--     (mirrored from cities.name / admin1_name on save) so existing reads
--     and any unmigrated UI keep working — single source of truth is now
--     city_id, but no consumer has to know that yet.
--   - The view exposes package_city_id + package_city_slug + package_city_geog
--     so the filter can match on city_id and the relaxation ladder can call
--     nearby_cities() without a second round trip.
--
-- Backfill of city_id runs out-of-band via the Phase 1e Node script.
-- This migration is additive — nothing downstream needs to change to ship.

BEGIN;

-- 1. The FK + index. ON DELETE SET NULL so deleting a city (very rare —
--    only on a curated re-seed) doesn't take agents down with it.
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agents_city_id_idx ON agents (city_id);

-- 2. Rebuild packages_with_agent to surface the new structured city fields.
--    - package_location stays for backwards compat (currently used by
--      checkout / order pages that just display the location text).
--    - package_city_id is the canonical filter key once Phase 1f ships.
--    - package_city_slug is what the URL carries (?city=akola-in-mh) so the
--      filter can be matched without a JOIN at query time.
--    - package_city_geog lets future ad-hoc PostGIS queries (e.g. "packages
--      within 100km of a lat/lng pin") work directly against the view.
DROP VIEW IF EXISTS packages_with_agent;

CREATE VIEW packages_with_agent
  WITH (security_invoker = true) AS
SELECT
  p.*,
  a.known_as          AS agent_known_as,
  a.profile_image     AS agent_profile_image,
  a.rating_avg        AS agent_rating_avg,
  a.rating_total      AS agent_rating_total,
  a.city              AS package_location,
  a.city_id           AS package_city_id,
  c.slug              AS package_city_slug,
  c.name              AS package_city_name,
  c.admin1_name       AS package_admin1_name,
  c.geog              AS package_city_geog
FROM packages p
INNER JOIN agents a ON a.auth_user_id = p.agent_id
LEFT JOIN  cities c ON c.id = a.city_id;

GRANT SELECT ON packages_with_agent TO anon, authenticated;

COMMIT;
