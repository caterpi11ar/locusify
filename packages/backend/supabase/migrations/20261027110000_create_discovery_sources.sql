-- Optional, explicit account-level survey answer. No free text or device data.
create table public.discovery_sources (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source text not null check (source in (
    'friend_colleague', 'search', 'x', 'linkedin', 'youtube', 'github',
    'bilibili', 'douyin', 'xiaohongshu', 'other_social', 'blog_newsletter',
    'ai_assistant', 'work', 'offline_event', 'dont_remember', 'other'
  ))
);

alter table public.discovery_sources enable row level security;
revoke all on public.discovery_sources from anon, authenticated;
grant select, insert, update on public.discovery_sources to authenticated;

create policy "Read own discovery source" on public.discovery_sources
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own discovery source" on public.discovery_sources
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own discovery source" on public.discovery_sources
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
