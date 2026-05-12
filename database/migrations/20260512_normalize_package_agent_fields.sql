-- Normalize agent metadata on packages.
--
-- Before: `packages` carried denormalized copies of agent fields
--   (agent_known_as, agent_profile_image, agent_rating_avg, agent_rating_total)
--   that drifted out of sync with the canonical `agents` table whenever an
--   agent updated their profile or earned a new review.
--
-- After: `agents` is the single source of truth. Listing surfaces read from
--   the `packages_with_agent` view which JOINs packages → agents on the
--   relationship the wizard already writes (packages.agent_id = agents.auth_user_id).

BEGIN;

-- 1. Enforce one agents row per auth user. Required as a FK target and also
--    prevents future "two agents share the same auth user" data corruption.
CREATE UNIQUE INDEX IF NOT EXISTS agents_auth_user_id_uniq
  ON agents (auth_user_id);

-- 2. FK so every package points at a real agents row. If this step fails the
--    error names the offending row: a package whose agent_id doesn't match
--    any agents.auth_user_id. Easiest fix is to delete that package and
--    recreate it via the wizard (which writes agent_id from auth context).
ALTER TABLE packages
  ADD CONSTRAINT packages_agent_id_fkey
    FOREIGN KEY (agent_id)
    REFERENCES agents (auth_user_id)
    ON DELETE RESTRICT;

-- 3. Drop the denormalized columns. agents is the only home for these now.
ALTER TABLE packages
  DROP COLUMN IF EXISTS agent_known_as,
  DROP COLUMN IF EXISTS agent_profile_image,
  DROP COLUMN IF EXISTS agent_rating_avg,
  DROP COLUMN IF EXISTS agent_rating_total;

-- 4. Joining view. Columns are aliased to the legacy `agent_*` names so the
--    application reads them as if they still lived on `packages`. Sort and
--    filter on rating/known_as work natively against this view.
--
--    NOTE: `SELECT p.*` snapshots packages columns at view-creation time. If
--    you later ALTER TABLE packages (add/drop columns), DROP and recreate
--    this view so it picks up the schema change.
DROP VIEW IF EXISTS packages_with_agent;
CREATE VIEW packages_with_agent
  WITH (security_invoker = true) AS
SELECT
  p.*,
  a.known_as      AS agent_known_as,
  a.profile_image AS agent_profile_image,
  a.rating_avg    AS agent_rating_avg,
  a.rating_total  AS agent_rating_total
FROM packages p
INNER JOIN agents a ON a.auth_user_id = p.agent_id;

GRANT SELECT ON packages_with_agent TO anon, authenticated;

COMMIT;
