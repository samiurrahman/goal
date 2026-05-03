-- Enable Supabase Realtime for the bookings table so that
-- postgres_changes subscriptions receive INSERT / UPDATE / DELETE events.

-- REPLICA IDENTITY FULL is required so the full row (including old values)
-- is available to Realtime; without it only the primary key is sent for
-- UPDATE/DELETE which prevents RLS row-level filtering from working.
alter table public.bookings replica identity full;

-- Add the table to the supabase_realtime publication only if not already a member.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;
