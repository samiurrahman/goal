-- Tracks when a logged-in user reveals an agent's masked contact details on
-- the agent profile page ("shows interest"). Acts as a lead list for agents:
-- one row per (agent, user) pair — re-revealing just bumps updated_at.
--
-- Identity columns (user_name, user_email, user_phone) are denormalized to
-- match the agent_reviews pattern: the lead row captures the snapshot the
-- agent saw at the moment of reveal, even if the user later edits their
-- profile. The user_id FK still lets us join back to live profile data if
-- needed.

CREATE TABLE IF NOT EXISTS agent_interests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_interests_unique_pair UNIQUE (agent_id, user_id)
);

-- The /interested-users page reads "newest first" filtered by agent_id.
CREATE INDEX IF NOT EXISTS idx_agent_interests_agent_created
  ON agent_interests (agent_id, created_at DESC);

ALTER TABLE agent_interests ENABLE ROW LEVEL SECURITY;

-- A user can read / insert / update their own interest rows. Agents browsing
-- as users (or vice-versa) only see their own rows here.
DROP POLICY IF EXISTS agent_interests_user_rw ON agent_interests;
CREATE POLICY agent_interests_user_rw ON agent_interests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- An agent can read interest rows that point at the agent profile they own.
-- The join through `agents.auth_user_id` is the same ownership check used by
-- the rest of the app (see bookings page, profile page).
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
