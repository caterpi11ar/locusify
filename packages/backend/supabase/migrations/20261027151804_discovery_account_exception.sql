begin;
create schema discovery_private;
revoke all on schema discovery_private from public, anon, authenticated, service_role;
-- A single operator-managed exception; no client or service-key write API.
create table discovery_private.account_exception (
  user_id uuid primary key references auth.users(id) on delete cascade,
  singleton boolean not null default true unique check (singleton),
  granted_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  check (expires_at > granted_at and expires_at <= granted_at + interval '24 hours')
);
alter table discovery_private.account_exception enable row level security;
revoke all on discovery_private.account_exception from public, anon, authenticated, service_role;

create or replace function public.get_discovery_source() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  eligible boolean;
  answer public.discovery_sources%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select exists (
    select 1 from auth.users u cross join public.discovery_source_rollout r
    where u.id = auth.uid() and not coalesce(u.is_anonymous, false)
      and u.confirmed_at is not null and r.enabled_at is not null
      and r.enabled_at <= statement_timestamp()
      and (u.created_at >= r.enabled_at or exists (
        select 1 from discovery_private.account_exception e
        where e.user_id = u.id and e.granted_at <= statement_timestamp()
          and e.expires_at > statement_timestamp()
      ))
  ) into eligible;
  select * into answer from public.discovery_sources where user_id = auth.uid();
  return jsonb_build_object('eligible', eligible,
    'status', coalesce(answer.status, case when eligible then 'pending' else 'ineligible' end),
    'source', answer.source);
end;
$$;
revoke all on function public.get_discovery_source() from public, anon;
grant execute on function public.get_discovery_source() to authenticated;
notify pgrst, 'reload schema';
commit;
