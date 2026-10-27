-- Run with psql -v ON_ERROR_STOP=1 after backend migrations. Rolls back fixtures.
begin;
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000035'),
  ('00000000-0000-4000-8000-000000000036');
set local role service_role;
insert into public.profiles(id, display_name, avatar_url, provider)
values ('00000000-0000-4000-8000-000000000035', 'Account A', null, 'email'),
       ('00000000-0000-4000-8000-000000000036', 'Account B', null, 'email')
on conflict(id) do nothing;
insert into public.subscriptions(user_id)
select id from public.profiles on conflict(user_id) do nothing;
-- Reprovisioning must preserve an existing paid entitlement.
update public.subscriptions set plan = 'max', status = 'expired'
where user_id = '00000000-0000-4000-8000-000000000035';
insert into public.subscriptions(user_id, plan) values
('00000000-0000-4000-8000-000000000035', 'free') on conflict(user_id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000035', true);
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Profile RLS'; end if;
  if (select count(*) from public.subscriptions) <> 1 then raise exception 'Subscription RLS'; end if;
  if (select plan from public.subscriptions) <> 'max' then raise exception 'Entitlement overwritten'; end if;
  begin
    update public.subscriptions set plan = 'pro';
    raise exception 'Entitlement escalation allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set provider = 'admin';
    raise exception 'Protected profile column writable';
  exception when insufficient_privilege then null; end;
end $$;
update public.profiles set display_name = 'Updated' where id = auth.uid();
reset role;
delete from auth.users where id = '00000000-0000-4000-8000-000000000035';
do $$ begin
  if exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000035')
    or exists (select 1 from public.subscriptions where user_id = '00000000-0000-4000-8000-000000000035')
  then raise exception 'Cascade failed'; end if;
  if has_table_privilege('anon', 'public.profiles', 'select')
    or has_table_privilege('anon', 'public.subscriptions', 'select')
  then raise exception 'Anonymous read allowed'; end if;
end $$;
rollback;
select 'account foundation PASS' as result;
