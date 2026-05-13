-- Indexes for the /packages listing query.
--
-- Today (~hundreds of rows) Postgres seq-scans the table and it's fast.
-- The same query at 1M rows is a multi-second scan — un-rescue-able by any
-- amount of client caching. These indexes target the exact predicates and
-- sort orders that fetchPackages() emits, so the planner can satisfy the
-- common filter combinations with index-only or bitmap scans.
--
-- All `WHERE published = true` partial indexes — drafts and unpublished
-- packages are never shown on /packages, and excluding them keeps the
-- index small (Postgres only stores tuples that match the partial WHERE).
-- The `id` tiebreaker matches fetchPackages' final .order('id') so the
-- sort is fully index-driven, no extra sort node.
--
-- All indexes use IF NOT EXISTS so re-running the migration is a no-op.
-- For very large tables in production we'd prefer CREATE INDEX CONCURRENTLY
-- (no table lock) but that can't run inside BEGIN/COMMIT — at current
-- volume an in-transaction CREATE finishes in well under a second and the
-- brief lock is fine. Switch to CONCURRENTLY (and drop the transaction)
-- once `packages` is large enough that you can feel the lock.

BEGIN;

-- 1. Default sort + date predicate.
--    THE most common query on the site: "published packages departing on
--    or after today, oldest departure first." Composite (departure_date,
--    id) lets the planner satisfy both ORDER BY departure_date and the
--    deterministic id-tiebreaker from one index walk, with the partial
--    WHERE eliminating ~all the never-shown rows.
CREATE INDEX IF NOT EXISTS packages_published_departure_idx
  ON packages (departure_date, id)
  WHERE published = true;

-- 2. Price-asc / price-desc sort.
--    Pilgrims sort by price more than by anything else. Including
--    departure_date as the second key lets the index serve mixed
--    queries like "cheapest, but still in Ramadan window" without a
--    re-sort.
CREATE INDEX IF NOT EXISTS packages_published_price_idx
  ON packages (price_per_person, departure_date)
  WHERE published = true;

-- 3. Newest sort.
--    DESC ordering at the index level so `ORDER BY created_at DESC`
--    walks the index forward (cheap) instead of reverse-scanning a
--    naive ASC index.
CREATE INDEX IF NOT EXISTS packages_published_created_idx
  ON packages (created_at DESC, id)
  WHERE published = true;

-- 4. Agent FK lookup.
--    `packages_agent_id_fkey` is declared in the normalize migration but
--    Postgres does NOT auto-index the referencing column for a FK
--    (it only indexes the referenced side). Without this, filtering by
--    agent_name or sorting by agent_rating_avg forces a hash join with a
--    seq scan of `packages` — disastrous at 1M rows. This single index
--    fixes both: the JOIN in packages_with_agent and any future "all
--    packages by agent X" lookup.
CREATE INDEX IF NOT EXISTS packages_agent_id_idx
  ON packages (agent_id);

-- 5. Hotel distance predicates.
--    Both are range filters (<= X). Single-column B-tree is sufficient
--    because the planner can bitmap-AND it with the partial date index
--    when both predicates are active. Partial WHERE keeps the index
--    small to the published universe.
CREATE INDEX IF NOT EXISTS packages_makkah_distance_idx
  ON packages (makkah_hotel_distance_m)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS packages_madinah_distance_idx
  ON packages (madinah_hotel_distance_m)
  WHERE published = true;

-- 6. Duration predicate.
--    Same shape as the distance filters — range, bitmap-AND-able with
--    the date index.
CREATE INDEX IF NOT EXISTS packages_duration_idx
  ON packages (total_duration_days)
  WHERE published = true;

-- 7. Agent rating sort.
--    The "Sort by rating" option does ORDER BY agent_rating_avg DESC via
--    the packages_with_agent view, which means agents.rating_avg is the
--    actual sort key. Without an index here, Postgres has to read all
--    agents rows, sort them, then nested-loop into packages — exactly
--    the kind of query that gets quadratically worse at scale.
--    NULLS LAST matches fetchPackages' `.order('agent_rating_avg',
--    { ascending: false, nullsFirst: false })`.
CREATE INDEX IF NOT EXISTS agents_rating_avg_idx
  ON agents (rating_avg DESC NULLS LAST);

-- 8. Run ANALYZE so the planner has fresh statistics for the new
--    indexes. Without this, the first few queries after migration may
--    not pick up the new indexes because Postgres still thinks a seq
--    scan is cheaper based on stale stats.
ANALYZE packages;
ANALYZE agents;

COMMIT;
