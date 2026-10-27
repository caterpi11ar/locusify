-- Isolated PostgreSQL fixture: minimal Supabase auth schema, never production.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, created_at timestamptz not null, confirmed_at timestamptz, is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
