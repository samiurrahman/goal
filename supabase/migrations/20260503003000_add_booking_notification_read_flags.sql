alter table public.bookings
  add column if not exists "readByAgent" boolean not null default false,
  add column if not exists "readByUser" boolean not null default false;

update public.bookings
set
  "readByAgent" = coalesce("readByAgent", false),
  "readByUser" = coalesce("readByUser", false)
where "readByAgent" is null or "readByUser" is null;
