-- Remove the trigger that propagated agent fields onto packages.
--
-- Before: `trg_sync_packages_agent_meta` fired on `agents` UPDATE and wrote
--   `agent_known_as`, `agent_profile_image`, `agent_rating_avg`,
--   `agent_rating_total` onto every matching `packages` row. This was the
--   old denormalization-sync mechanism.
--
-- After: those four columns no longer exist (dropped in
--   20260512_normalize_package_agent_fields.sql). The `packages_with_agent`
--   view JOINs against `agents` on every read, so renaming an agent or
--   refreshing their rating cache is reflected in package listings with no
--   propagation. The trigger is now dead code AND broken — every UPDATE on
--   `agents` was failing with "column agent_known_as ... does not exist".

BEGIN;

DROP TRIGGER IF EXISTS trg_sync_packages_agent_meta ON agents;
DROP FUNCTION IF EXISTS public.sync_packages_agent_meta();

COMMIT;
