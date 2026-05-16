-- Per-user saved packages. The heart icon on every package card writes here;
-- /favorites reads here. Naming mirrors agent_interests: (user_id, entity_id)
-- with a UNIQUE pair so re-tapping the heart is idempotent (and the toggle
-- path can lean on DELETE-by-pair without needing the row id).
--
-- The 20260515_rls_baseline.sql migration already runs ENABLE ROW LEVEL
-- SECURITY on `favorites` but intentionally left ZERO policies (because the
-- column name wasn't yet decided). That meant the table was unreachable from
-- the client. This migration locks in `user_id` and adds the owner policy so
-- the feature actually works.
--
-- IMPORTANT: a `favorites` table already exists with a different column
-- shape — per the baseline migration comments, it's unused (no application
-- code referenced it; verified by grep). We drop and recreate so the column
-- names line up with the policy below. CASCADE clears any old policies/grants
-- that were attached to the previous shape. If you have started using this
-- table since 2026-05-15, STOP and back up its rows before running.

DROP TABLE IF EXISTS favorites CASCADE;

CREATE TABLE favorites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- packages.id is uuid (despite TS types claiming `number` — strings at runtime).
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT favorites_unique_pair UNIQUE (user_id, package_id)
);

-- /favorites lists newest-first per user.
CREATE INDEX IF NOT EXISTS idx_favorites_user_created
  ON favorites (user_id, created_at DESC);

-- Hot path on every card render: "is this package_id in my favorites?"
-- Covered by the UNIQUE pair index, so no separate index needed.

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorites_owner_all ON favorites;
CREATE POLICY favorites_owner_all ON favorites
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
