-- Backend account foundation. Provisioning remains in provisionUser;
-- no Auth trigger, metadata-derived entitlement, or historical-user backfill.
-- Existing installations with these tables must reconcile their schema first.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'max')),
  status text not null default 'active'
    check (status in ('active', 'canceled', 'expired', 'past_due')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  provider text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
revoke all on public.profiles, public.subscriptions from public, anon, authenticated;
grant all on public.profiles, public.subscriptions to service_role;
grant select on public.profiles, public.subscriptions to authenticated;
grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "Read own subscription" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
commit;
