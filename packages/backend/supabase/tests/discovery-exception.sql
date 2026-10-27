\set ON_ERROR_STOP on
begin;
create function pg_temp.check_result(ok boolean, label text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS: %', label;
end $$;
insert into auth.users(id, created_at, confirmed_at, is_anonymous) values
('00000000-0000-4000-8000-000000000101','2020-01-01','2020-01-01',false),
('00000000-0000-4000-8000-000000000102','2020-01-01','2020-01-01',false),
('00000000-0000-4000-8000-000000000103','2020-01-01',null,false),
('00000000-0000-4000-8000-000000000104','2020-01-01','2020-01-01',true);
update public.discovery_source_rollout set enabled_at = null;
insert into discovery_private.account_exception(user_id, expires_at)
values ('00000000-0000-4000-8000-000000000101',statement_timestamp()+interval '1 hour');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000101';
select pg_temp.check_result(public.get_discovery_source()->>'status'='ineligible','global disable wins');
reset role;
update public.discovery_source_rollout set enabled_at = statement_timestamp()-interval '1 minute';
set local role authenticated;
select pg_temp.check_result(public.get_discovery_source()->>'status'='pending','target old account eligible');
do $$ begin
  begin perform * from discovery_private.account_exception; raise exception 'Private table readable';
  exception when insufficient_privilege then null; end;
  begin insert into discovery_private.account_exception(user_id, expires_at)
    values(auth.uid(),now()+interval '1 hour'); raise exception 'Self grant permitted';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000102';
select pg_temp.check_result(public.get_discovery_source()->>'status'='ineligible','other old account excluded');
do $$ begin
  begin perform public.save_discovery_source('skipped'); raise exception 'Other old account write accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update discovery_private.account_exception set user_id='00000000-0000-4000-8000-000000000103';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000103';
select pg_temp.check_result(public.get_discovery_source()->>'eligible'='false','unconfirmed exception denied');
reset role;
update discovery_private.account_exception set user_id='00000000-0000-4000-8000-000000000104';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000104';
select pg_temp.check_result(public.get_discovery_source()->>'eligible'='false','anonymous exception denied');
reset role;
update discovery_private.account_exception set user_id='00000000-0000-4000-8000-000000000101',
  granted_at=statement_timestamp()-interval '2 hours', expires_at=statement_timestamp()-interval '1 hour';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000101';
select pg_temp.check_result(public.get_discovery_source()->>'status'='ineligible','expiry denies target');
reset role;
delete from discovery_private.account_exception;
set local role authenticated;
select pg_temp.check_result(public.get_discovery_source()->>'status'='ineligible','revocation denies target');
reset role;
insert into discovery_private.account_exception(user_id, expires_at)
values ('00000000-0000-4000-8000-000000000101',statement_timestamp()+interval '1 hour');
set local role authenticated;
select pg_temp.check_result(public.save_discovery_source('submitted','bilibili')->>'status'='submitted','target submit persists');
select pg_temp.check_result(public.save_discovery_source('skipped')->>'source'='bilibili','retry cannot overwrite');
reset role;
delete from discovery_private.account_exception;
set local role authenticated;
select pg_temp.check_result(public.get_discovery_source()->>'status'='submitted','cleanup preserves terminal response');
reset role;
insert into discovery_private.account_exception(user_id, expires_at)
values ('00000000-0000-4000-8000-000000000102',statement_timestamp()+interval '1 hour');
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000102';
select pg_temp.check_result(public.save_discovery_source('skipped')->>'status'='skipped','target skip persists');
select pg_temp.check_result(public.save_discovery_source('submitted','douyin')->>'status'='skipped','skip remains terminal');
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000102';
select pg_temp.check_result(not exists(select 1 from discovery_private.account_exception),'account deletion cascades');
select pg_temp.check_result(not has_schema_privilege('anon','discovery_private','usage')
  and not has_schema_privilege('authenticated','discovery_private','usage')
  and not has_schema_privilege('service_role','discovery_private','usage'),'private schema denied to API roles');
rollback;
select 'PASS: discovery account exception' as result;
