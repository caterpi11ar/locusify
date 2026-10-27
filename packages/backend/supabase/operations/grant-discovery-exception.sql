-- psql -v ON_ERROR_STOP=1 -v paired_deployment_ready=true -v target_email=<authorized-email> -f <this file>
-- Only run after Release verifies both deployed versions and normal rollout.
\set ON_ERROR_STOP on
begin;
select set_config('discovery.paired_deployment_ready', :'paired_deployment_ready', true);
select set_config('discovery.target_email', :'target_email', true);
do $$
declare target_id uuid;
begin
  if current_setting('discovery.paired_deployment_ready') <> 'true' then
    raise exception 'Paired deployment readiness must be confirmed';
  end if;
  select id into strict target_id from auth.users
    where lower(email) = lower(current_setting('discovery.target_email'))
      and confirmed_at is not null and not coalesce(is_anonymous, false);
  if not exists (select 1 from public.discovery_source_rollout
    where enabled_at is not null and enabled_at <= statement_timestamp()) then
    raise exception 'Rollout must be enabled after paired deployment';
  end if;
  if exists (select 1 from public.discovery_sources where user_id = target_id) then
    raise exception 'Account already has a terminal response; do not reset it';
  end if;
  insert into discovery_private.account_exception(user_id, expires_at)
    values (target_id, statement_timestamp() + interval '1 hour');
  -- Plain INSERT intentionally rejects retries instead of extending the window.
end $$;
select user_id, granted_at, expires_at from discovery_private.account_exception;
commit;
