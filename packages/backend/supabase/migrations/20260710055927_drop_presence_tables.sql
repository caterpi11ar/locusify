drop table if exists public.user_locations cascade;
drop table if exists public.user_presence_settings cascade;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'presence_visibility'
  ) then
    execute 'drop type public.presence_visibility';
  end if;
end $$;
