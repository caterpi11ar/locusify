\set ON_ERROR_STOP on
create function public.assert_true(ok boolean, label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; end $$;
insert into auth.users values
('00000000-0000-0000-0000-000000000001','2026-01-01','2026-01-01',false),
('00000000-0000-0000-0000-000000000002','2026-01-02','2026-01-02',false),
('00000000-0000-0000-0000-000000000003','2026-01-02',null,false),
('00000000-0000-0000-0000-000000000004','2026-01-02','2026-01-02',true),
('00000000-0000-0000-0000-000000000005','2026-01-02','2026-01-02',false),
('00000000-0000-0000-0000-000000000006','2026-01-02','2026-01-02',false);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select assert_true(get_discovery_source()->>'status' = 'ineligible','disabled');
reset role;
update discovery_source_rollout set enabled_at = '2026-01-02';
set role authenticated;
select assert_true(get_discovery_source()->>'status' = 'pending','inclusive boundary');
select assert_true(save_discovery_source('submitted','bilibili')->>'source' = 'bilibili','submit');
select assert_true(save_discovery_source('skipped')->>'source' = 'bilibili','skip cannot overwrite');
select assert_true(save_discovery_source('submitted','douyin')->>'source' = 'bilibili','first response wins');
do $$ begin
  begin perform save_discovery_source('submitted','bad'); raise exception 'accepted bad source'; exception when invalid_parameter_value then null; end;
  begin perform save_discovery_source('skipped','douyin'); raise exception 'accepted skip source'; exception when invalid_parameter_value then null; end;
  begin update discovery_sources set source='douyin'; raise exception 'direct update allowed'; exception when insufficient_privilege then null; end;
  begin insert into discovery_sources values ('00000000-0000-0000-0000-000000000005','douyin','submitted'); raise exception 'cross account insert allowed'; exception when insufficient_privilege then null; end;
  begin update discovery_source_rollout set enabled_at=null; raise exception 'rollout update allowed'; exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select assert_true(get_discovery_source()->>'status' = 'ineligible','old account');
select assert_true((select count(*) from discovery_sources)=0,'RLS hides other account');
do $$ begin begin perform save_discovery_source('skipped'); raise exception 'old user accepted'; exception when insufficient_privilege then null; end; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select assert_true(get_discovery_source()->>'eligible' = 'false','unconfirmed');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select assert_true(get_discovery_source()->>'eligible' = 'false','anonymous account');
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
select assert_true(save_discovery_source('skipped')->>'status' = 'skipped','skip persisted');
select assert_true(save_discovery_source('submitted','douyin')->>'status' = 'skipped','skip terminal');
select assert_true(get_discovery_source()->'source' = 'null'::jsonb,'skip has no channel');
set request.jwt.claim.sub = '';
do $$ begin begin perform get_discovery_source(); raise exception 'missing identity accepted'; exception when insufficient_privilege then null; end; end $$;
reset role;
set role anon;
do $$ begin
  begin perform get_discovery_source(); raise exception 'anon RPC allowed'; exception when insufficient_privilege then null; end;
  begin perform * from discovery_sources; raise exception 'anon read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.users where id='00000000-0000-0000-0000-000000000005';
select assert_true(not exists(select 1 from discovery_sources where user_id='00000000-0000-0000-0000-000000000005'),'delete cascades');
select 'PASS: lifecycle, eligibility, permissions, RLS, cascade';
