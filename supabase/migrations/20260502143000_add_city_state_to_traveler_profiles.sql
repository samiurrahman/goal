alter table public.traveler_profiles
add column if not exists traveler_city text,
add column if not exists traveler_state text;

create index if not exists idx_traveler_profiles_city_state
on public.traveler_profiles(auth_user_id, traveler_city, traveler_state);
