-- ============================================================================
-- RLS BASELINE — searchumrah.com
-- ============================================================================
-- Goal: every user-facing table has Row-Level Security ENABLED with policies
-- that match the access patterns the application code already uses.
--
-- HOW TO APPLY (do this from the Supabase Dashboard):
--   1. Open https://app.supabase.com → your project → SQL Editor → "New query"
--   2. First run STEP 0 (inspection) and read the output. If you see existing
--      policies you don't recognize, STOP and review them before continuing.
--   3. Then run STEP 1..N below in order. The script is idempotent — it uses
--      DROP POLICY IF EXISTS / CREATE OR REPLACE, so re-running is safe.
--   4. After applying, smoke-test:
--      - browse /packages as a logged-out visitor
--      - browse /[agentName] and submit a review as a logged-in user
--      - log in as an agent, view /bookings and /interested-users
--      - create a booking from /checkout as a regular user
--
-- COVERED TABLES:
--   agents, packages, package_details, agent_reviews, agent_interests*,
--   agent_slug_redirects, bookings, traveler_profiles, user_details,
--   favorites (schema-conditional — see STEP 9), cities
--   *agent_interests already had policies via 20260515_agent_interests.sql;
--    re-asserted here for completeness.
--
-- NOT TOUCHED: spatial_ref_sys, geography_columns, geometry_columns
--   (PostGIS system tables — Supabase's "UNRESTRICTED" warning on
--    spatial_ref_sys is acceptable; it is read-only reference data.)
-- ============================================================================


-- =========================
-- STEP 0  Inspection (run this FIRST, by itself)
-- =========================
-- See which tables already have RLS on, and which policies exist:
--
-- SELECT relname AS table_name, relrowsecurity AS rls_enabled
-- FROM pg_class
-- WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
-- ORDER BY relname;
--
-- SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- Confirm column names (used by the policies below):
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('agents','packages','package_details','agent_reviews',
--                      'agent_slug_redirects','bookings','traveler_profiles',
--                      'user_details','favorites')
-- ORDER BY table_name, ordinal_position;


BEGIN;

-- =========================
-- STEP 1  agents
-- =========================
-- Public read (browsing). Owner write via auth_user_id = auth.uid().
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agents_public_read ON agents;
CREATE POLICY agents_public_read ON agents
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS agents_owner_insert ON agents;
CREATE POLICY agents_owner_insert ON agents
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS agents_owner_update ON agents;
CREATE POLICY agents_owner_update ON agents
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS agents_owner_delete ON agents;
CREATE POLICY agents_owner_delete ON agents
  FOR DELETE
  USING (auth.uid() = auth_user_id);


-- =========================
-- STEP 2  packages
-- =========================
-- Public read (listings). Owner write where packages.agent_id = agent's auth.uid().
-- (per 20260512_normalize_package_agent_fields.sql, packages.agent_id is the
--  agent's auth_user_id and FK'd to agents.auth_user_id.)
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS packages_public_read ON packages;
CREATE POLICY packages_public_read ON packages
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS packages_owner_insert ON packages;
CREATE POLICY packages_owner_insert ON packages
  FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS packages_owner_update ON packages;
CREATE POLICY packages_owner_update ON packages
  FOR UPDATE
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS packages_owner_delete ON packages;
CREATE POLICY packages_owner_delete ON packages
  FOR DELETE
  USING (auth.uid() = agent_id);


-- =========================
-- STEP 3  package_details
-- =========================
-- Public read (rendered on /[agentName]/[slug]).
-- Write only by the agent who owns the parent package.
ALTER TABLE package_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS package_details_public_read ON package_details;
CREATE POLICY package_details_public_read ON package_details
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS package_details_owner_insert ON package_details;
CREATE POLICY package_details_owner_insert ON package_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM packages p
      WHERE p.id = package_details.package_id
        AND p.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS package_details_owner_update ON package_details;
CREATE POLICY package_details_owner_update ON package_details
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM packages p
      WHERE p.id = package_details.package_id
        AND p.agent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM packages p
      WHERE p.id = package_details.package_id
        AND p.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS package_details_owner_delete ON package_details;
CREATE POLICY package_details_owner_delete ON package_details
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM packages p
      WHERE p.id = package_details.package_id
        AND p.agent_id = auth.uid()
    )
  );


-- =========================
-- STEP 4  agent_reviews
-- =========================
-- Public read. Write by the reviewer (user_id = auth.uid()).
-- Server-side guard in /api/agents/reviews additionally blocks user_type='agent'
-- from posting reviews; we don't enforce that in RLS to keep the policy simple.
ALTER TABLE agent_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_reviews_public_read ON agent_reviews;
CREATE POLICY agent_reviews_public_read ON agent_reviews
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS agent_reviews_reviewer_insert ON agent_reviews;
CREATE POLICY agent_reviews_reviewer_insert ON agent_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS agent_reviews_reviewer_update ON agent_reviews;
CREATE POLICY agent_reviews_reviewer_update ON agent_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS agent_reviews_reviewer_delete ON agent_reviews;
CREATE POLICY agent_reviews_reviewer_delete ON agent_reviews
  FOR DELETE
  USING (auth.uid() = user_id);


-- =========================
-- STEP 5  agent_interests  (re-asserts 20260515_agent_interests.sql)
-- =========================
ALTER TABLE agent_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_interests_user_rw ON agent_interests;
CREATE POLICY agent_interests_user_rw ON agent_interests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS agent_interests_agent_read ON agent_interests;
CREATE POLICY agent_interests_agent_read ON agent_interests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_interests.agent_id
        AND a.auth_user_id = auth.uid()
    )
  );


-- =========================
-- STEP 6  agent_slug_redirects
-- =========================
-- Public read so the routing layer can resolve old slugs → new slugs without
-- being authenticated. Insert by the agent that owns the source agents row.
-- Update/delete by the same owner (rarely needed; included for completeness).
ALTER TABLE agent_slug_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_slug_redirects_public_read ON agent_slug_redirects;
CREATE POLICY agent_slug_redirects_public_read ON agent_slug_redirects
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS agent_slug_redirects_owner_insert ON agent_slug_redirects;
CREATE POLICY agent_slug_redirects_owner_insert ON agent_slug_redirects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_slug_redirects.agent_id
        AND a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS agent_slug_redirects_owner_modify ON agent_slug_redirects;
CREATE POLICY agent_slug_redirects_owner_modify ON agent_slug_redirects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_slug_redirects.agent_id
        AND a.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_slug_redirects.agent_id
        AND a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS agent_slug_redirects_owner_delete ON agent_slug_redirects;
CREATE POLICY agent_slug_redirects_owner_delete ON agent_slug_redirects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      WHERE a.id = agent_slug_redirects.agent_id
        AND a.auth_user_id = auth.uid()
    )
  );


-- =========================
-- STEP 7  bookings
-- =========================
-- Cross-party table. Either party (the booking user OR the agent the booking
-- is with) can read and update; only the user who is the booker can insert.
-- agent_id on this table is the agent's auth_user_id (per cancel route).
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_party_read ON bookings;
CREATE POLICY bookings_party_read ON bookings
  FOR SELECT
  USING (auth.uid() = auth_user_id OR auth.uid() = agent_id);

DROP POLICY IF EXISTS bookings_user_insert ON bookings;
CREATE POLICY bookings_user_insert ON bookings
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Update permitted to either party. Tightening (e.g., user can only set
-- status='cancelled', agent can only set status in {confirmed,cancelled}) is
-- enforced in the API routes — bringing it into RLS would require column-level
-- triggers and would couple policy to schema. Revisit if direct PostgREST
-- writes to this table become common.
DROP POLICY IF EXISTS bookings_party_update ON bookings;
CREATE POLICY bookings_party_update ON bookings
  FOR UPDATE
  USING (auth.uid() = auth_user_id OR auth.uid() = agent_id)
  WITH CHECK (auth.uid() = auth_user_id OR auth.uid() = agent_id);

-- No DELETE policy → no client can hard-delete bookings. Use status='cancelled'.


-- =========================
-- STEP 8  traveler_profiles
-- =========================
-- The list of saved companions a user pre-fills on /checkout. Owner-only.
ALTER TABLE traveler_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS traveler_profiles_owner_all ON traveler_profiles;
CREATE POLICY traveler_profiles_owner_all ON traveler_profiles
  FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);


-- =========================
-- STEP 9  user_details
-- =========================
-- Owner-only. Lead data exposed to agents is denormalized into
-- agent_interests.{user_name,user_email,user_phone} and bookings columns,
-- so agents do NOT need cross-read access here. Reviewer profile enrichment
-- in /api/agents/reviews uses the service role and bypasses RLS (correct).
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_details_owner_all ON user_details;
CREATE POLICY user_details_owner_all ON user_details
  FOR ALL
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);


-- =========================
-- STEP 10  favorites  (CONDITIONAL — verify schema first)
-- =========================
-- The `favorites` table exists but is not yet wired into the application code.
-- Run this query first to confirm the owner column name:
--
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='favorites' ORDER BY ordinal_position;
--
-- Then UNCOMMENT the block below that matches the column name you saw.

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Variant A: column is `user_id`
-- DROP POLICY IF EXISTS favorites_owner_all ON favorites;
-- CREATE POLICY favorites_owner_all ON favorites
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- Variant B: column is `auth_user_id`
-- DROP POLICY IF EXISTS favorites_owner_all ON favorites;
-- CREATE POLICY favorites_owner_all ON favorites
--   FOR ALL
--   USING (auth.uid() = auth_user_id)
--   WITH CHECK (auth.uid() = auth_user_id);

-- IMPORTANT: until one of the variants is uncommented, the table has RLS
-- enabled but ZERO policies → no client can read or write it. That is the
-- safe default for an unused table; no production traffic depends on it.


-- =========================
-- STEP 11  cities
-- =========================
-- Read-only catalog. Public read; no write policies (only the seed script,
-- run with the service role key out-of-band, can mutate).
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cities_public_read ON cities;
CREATE POLICY cities_public_read ON cities
  FOR SELECT
  USING (true);


COMMIT;


-- =========================
-- POST-APPLY VERIFICATION
-- =========================
-- Run this and confirm every row says rls_enabled = true:
--
-- SELECT relname AS table_name, relrowsecurity AS rls_enabled
-- FROM pg_class
-- WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
--   AND relname IN ('agents','packages','package_details','agent_reviews',
--                   'agent_interests','agent_slug_redirects','bookings',
--                   'traveler_profiles','user_details','favorites','cities')
-- ORDER BY relname;
--
-- Then list every policy by table for a final review:
--
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='public'
-- ORDER BY tablename, policyname;
