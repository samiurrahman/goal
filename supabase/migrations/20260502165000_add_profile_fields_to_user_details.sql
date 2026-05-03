alter table public.user_details
add column if not exists address text,
add column if not exists phone text,
add column if not exists date_of_birth date,
add column if not exists gender text;
