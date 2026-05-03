create table if not exists public.traveler_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  relationship text not null default 'other',
  is_default boolean not null default false,
  first_name text,
  last_name text,
  date_of_birth date,
  gender text,
  nationality text,
  passport_number text,
  passport_expiry date,
  issuing_country text,
  phone text,
  email text,
  known_traveler_number text,
  meal_preference text,
  special_assistance text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_traveler_profiles_auth_user_id on public.traveler_profiles(auth_user_id);
create index if not exists idx_traveler_profiles_default on public.traveler_profiles(auth_user_id, is_default);

create or replace function public.set_traveler_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_traveler_profiles_updated_at on public.traveler_profiles;
create trigger trg_traveler_profiles_updated_at
before update on public.traveler_profiles
for each row
execute function public.set_traveler_profiles_updated_at();

alter table public.traveler_profiles enable row level security;

drop policy if exists traveler_profiles_select_own on public.traveler_profiles;
create policy traveler_profiles_select_own
on public.traveler_profiles
for select
using (auth.uid() = auth_user_id);

drop policy if exists traveler_profiles_insert_own on public.traveler_profiles;
create policy traveler_profiles_insert_own
on public.traveler_profiles
for insert
with check (auth.uid() = auth_user_id);

drop policy if exists traveler_profiles_update_own on public.traveler_profiles;
create policy traveler_profiles_update_own
on public.traveler_profiles
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists traveler_profiles_delete_own on public.traveler_profiles;
create policy traveler_profiles_delete_own
on public.traveler_profiles
for delete
using (auth.uid() = auth_user_id);
