-- Make `agents.city` the single source of truth for a package's location.
--
-- Before: `packages.package_location` was free-text the wizard asked the
--   agent to fill in. It almost always duplicated `agents.city` and drifted
--   whenever the agent updated their profile city.
--
-- After: `packages.package_location` is dropped entirely. The
--   `packages_with_agent` view exposes `package_location` aliased from
--   `agents.city`, so:
--     - The location filter on /packages keeps working (same column name).
--     - When an agent updates their city, every one of their packages
--       instantly reflects the new location on the next read.
--     - The wizard no longer collects a location field.

BEGIN;

-- 1. Drop the view first so we can drop the underlying column it depends on,
--    then recreate the view with the new source for `package_location`.
DROP VIEW IF EXISTS packages_with_agent;

ALTER TABLE packages
  DROP COLUMN IF EXISTS package_location;

CREATE VIEW packages_with_agent
  WITH (security_invoker = true) AS
SELECT
  p.*,
  a.known_as       AS agent_known_as,
  a.profile_image  AS agent_profile_image,
  a.rating_avg     AS agent_rating_avg,
  a.rating_total   AS agent_rating_total,
  a.city           AS package_location
FROM packages p
INNER JOIN agents a ON a.auth_user_id = p.agent_id;

GRANT SELECT ON packages_with_agent TO anon, authenticated;

COMMIT;
