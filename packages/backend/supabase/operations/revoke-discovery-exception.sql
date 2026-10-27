-- Use the UUID returned by grant, not an email that might since have changed.
-- psql -v ON_ERROR_STOP=1 -v target_uuid=<recorded UUID> -f <this file>
\set ON_ERROR_STOP on
begin;
delete from discovery_private.account_exception where user_id = :'target_uuid'::uuid;
commit;
-- Never delete discovery_sources: submitted/skipped is the once-only marker.
