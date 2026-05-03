alter table public.packages
  add column if not exists published boolean not null default true;

update public.packages
set published = true
where published is null;
