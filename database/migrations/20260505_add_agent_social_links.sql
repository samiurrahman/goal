alter table public.agents
  add column if not exists whatsapp_url text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text;
