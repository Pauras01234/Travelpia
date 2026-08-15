-- Premium entitlement + daily Ask usage.
--
-- Apply in the Supabase SQL editor, then redeploy the backend.
-- Idempotent: safe to re-run.
--
-- Two things live here:
--   1. profiles.plan  — the entitlement tier, writable only by the backend.
--   2. usage_daily    — the durable per-day counter behind the Ask quota.

-- ---------------------------------------------------------------- plan ----
alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists plan_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check check (plan in ('free', 'premium'));
  end if;
end $$;

-- The existing "Users can update own profile" policy allows a client holding
-- an anon key and their own JWT to update ANY column on their row — including
-- plan. Postgres has no column-level grant inside RLS, so a trigger enforces
-- it. The backend uses the service-role key, which bypasses RLS entirely and
-- is therefore unaffected.
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan is distinct from old.plan then
    raise exception 'plan cannot be changed by the client';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan
  before update on public.profiles
  for each row
  -- Block only requests that arrive through PostgREST as an end user.
  -- auth.role() is NULL for the service-role backend, for `postgres`, and in
  -- the SQL editor -- all of which must stay able to change a plan (support
  -- fixes, granting premium by hand).
  when (auth.role() in ('anon', 'authenticated'))
  execute function public.protect_profile_plan();

-- Keep plan_updated_at honest for support/debugging.
create or replace function public.stamp_plan_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.plan is distinct from old.plan then
    new.plan_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_stamp_plan on public.profiles;
create trigger profiles_stamp_plan
  before update on public.profiles
  for each row
  execute function public.stamp_plan_updated_at();

-- --------------------------------------------------------------- usage ----
create table if not exists public.usage_daily (
  user_id   uuid        not null references auth.users(id) on delete cascade,
  day       date        not null,
  ask_count integer     not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- RLS enabled with NO policies: no client role can read or write this table
-- at all. Only the service role (which bypasses RLS) touches it.
alter table public.usage_daily enable row level security;

-- Atomic increment. Doing this as read-then-write in the application lets two
-- concurrent asks both read N and both write N+1; a single statement with
-- ON CONFLICT cannot.
create or replace function public.increment_ask_usage(p_user uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.usage_daily (user_id, day, ask_count, updated_at)
  values (p_user, (now() at time zone 'utc')::date, 1, now())
  on conflict (user_id, day) do update
    set ask_count = public.usage_daily.ask_count + 1,
        updated_at = now()
  returning ask_count;
$$;

revoke all on function public.increment_ask_usage(uuid) from public, anon, authenticated;

-- Retention: rows are tiny, but there is no reason to keep them forever.
-- Run periodically (pg_cron, or by hand):
--   delete from public.usage_daily where day < current_date - interval '90 days';
