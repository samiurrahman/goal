-- Add a tags column to packages so agents can categorize listings with the
-- chips shown in the public listing/home cards (Ramadan, Direct flight,
-- Popular, Short trip, VIP, Accessible, Budget).
--
-- Stored as text[] (not enum/junction table) because:
--   - The list is short and curated UI-side.
--   - Filtering uses Postgres array operators (@>, &&) which are fast with GIN.
--   - Adding/removing a tag is a single UI/constant change with no schema churn.

alter table public.packages
  add column if not exists tags text[] not null default '{}'::text[];

-- GIN index makes `tags @> ARRAY['Popular']` and `tags && ARRAY[...]` cheap
-- even as the table grows. Used by the public listing filters.
create index if not exists idx_packages_tags_gin
  on public.packages
  using gin (tags);

-- Constrain entries to the curated set. This is a CHECK on the array's
-- subset relationship, so adding a new tag means updating both the UI
-- constant and this check.
alter table public.packages
  drop constraint if exists packages_tags_allowed_check;

alter table public.packages
  add constraint packages_tags_allowed_check
  check (
    tags <@ ARRAY[
      'Ramadan',
      'Direct flight',
      'Popular',
      'Short trip',
      'VIP',
      'Accessible',
      'Budget'
    ]::text[]
  );
