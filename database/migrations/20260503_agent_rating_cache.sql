-- Cache agent rating stats on agents table so listing pages avoid per-agent API calls.

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_total integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION refresh_agent_rating_cache(p_agent_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_avg numeric(3,2) := 0;
  v_total integer := 0;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)::integer
  INTO v_avg, v_total
  FROM agent_reviews
  WHERE agent_id = p_agent_id;

  UPDATE agents
  SET rating_avg = v_avg,
      rating_total = v_total
  WHERE id = p_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_refresh_agent_rating_cache()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_agent_rating_cache(NEW.agent_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.agent_id IS DISTINCT FROM OLD.agent_id THEN
      PERFORM refresh_agent_rating_cache(OLD.agent_id);
    END IF;
    PERFORM refresh_agent_rating_cache(NEW.agent_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM refresh_agent_rating_cache(OLD.agent_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS agent_reviews_refresh_agent_rating_cache ON agent_reviews;
CREATE TRIGGER agent_reviews_refresh_agent_rating_cache
AFTER INSERT OR UPDATE OR DELETE ON agent_reviews
FOR EACH ROW
EXECUTE FUNCTION trg_refresh_agent_rating_cache();

-- Backfill existing agent rating stats.
UPDATE agents a
SET rating_avg = s.avg_rating,
    rating_total = s.total_reviews
FROM (
  SELECT
    agent_id,
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS avg_rating,
    COUNT(*)::integer AS total_reviews
  FROM agent_reviews
  GROUP BY agent_id
) s
WHERE a.id = s.agent_id;

-- Ensure agents with zero reviews are set to 0/0.
UPDATE agents
SET rating_avg = 0,
    rating_total = 0
WHERE id NOT IN (SELECT DISTINCT agent_id FROM agent_reviews);
