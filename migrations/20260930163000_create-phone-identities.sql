-- Store the relationship between a verified mobile number and the
-- existing InsForge email identity without adding a phone column to public.users.
create table if not exists public.phone_identities (
  phone text primary key,
  email text not null unique,
  auth_user_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.phone_identities enable row level security;
