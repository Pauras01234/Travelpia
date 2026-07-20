-- Already applied in Supabase SQL editor — do not re-run.
-- Kept here as the source-of-truth schema reference for the backend.
--
-- TODO(launch): Re-enable "Confirm email" in Supabase Auth
-- (Dashboard → Authentication → Providers → Email) before public launch.
-- Currently OFF for local/dev speed; Email/password provider must stay enabled.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
