-- Expose agent city/state/country on packages_with_agent so package cards
-- can show the full agent location without joining agents a second time.
--
-- Before: only `a.city AS package_location` was aliased; agents.state and
-- agents.country were invisible to package-listing queries.
--
-- After: `agent_state` and `agent_country` are available on the view.
-- Existing callers of `package_location` are unaffected.

BEGIN;

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
  a.state             AS agent_state,
  a.country           AS agent_country,
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
