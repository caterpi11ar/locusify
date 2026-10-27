-- Disabled until an operator activates using database time after deployment.
create table public.discovery_source_rollout (
  singleton boolean primary key default true check (singleton),
  enabled_at timestamptz
);
insert into public.discovery_source_rollout values (true, null);
alter table public.discovery_source_rollout enable row level security;
revoke all on public.discovery_source_rollout from public, anon, authenticated;

alter table public.discovery_sources alter column source drop not null;
alter table public.discovery_sources add column status text not null default 'submitted';
alter table public.discovery_sources add constraint discovery_source_state check (
  (status = 'submitted' and source is not null) or
  (status = 'skipped' and source is null)
);
revoke insert, update on public.discovery_sources from authenticated;
drop policy "Insert own discovery source" on public.discovery_sources;
drop policy "Update own discovery source" on public.discovery_sources;

create function public.get_discovery_source() returns jsonb
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
      and r.enabled_at <= statement_timestamp() and u.created_at >= r.enabled_at
  ) into eligible;
  select * into answer from public.discovery_sources where user_id = auth.uid();
  return jsonb_build_object('eligible', eligible,
    'status', coalesce(answer.status, case when eligible then 'pending' else 'ineligible' end),
    'source', answer.source);
end;
$$;

create function public.save_discovery_source(p_status text, p_source text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_status is null or p_status not in ('submitted', 'skipped')
    or (p_status = 'submitted' and (p_source is null or p_source not in (
      'friend_colleague', 'search', 'x', 'linkedin', 'youtube', 'github',
      'bilibili', 'douyin', 'xiaohongshu', 'other_social', 'blog_newsletter',
      'ai_assistant', 'work', 'offline_event', 'dont_remember', 'other')))
    or (p_status = 'skipped' and p_source is not null) then
    raise exception 'Invalid survey response' using errcode = '22023';
  end if;
  if not (public.get_discovery_source()->>'eligible')::boolean then
    raise exception 'Survey not eligible' using errcode = '42501';
  end if;
  insert into public.discovery_sources(user_id, status, source)
    values (auth.uid(), p_status, p_source) on conflict (user_id) do nothing;
  return public.get_discovery_source();
end;
$$;
revoke all on function public.get_discovery_source() from public, anon;
revoke all on function public.save_discovery_source(text, text) from public, anon;
grant execute on function public.get_discovery_source() to authenticated;
grant execute on function public.save_discovery_source(text, text) to authenticated;
