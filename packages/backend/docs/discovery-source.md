# Discovery source survey contract (LOC-34)

This supersedes the LOC-32 skip/no-request and replace-answer behavior.
Bearer authentication is required for GET/PUT `/api/v1/discovery-source`.

GET and successful PUT return HTTP 200:
`{"success":true,"data":{"eligible":true,"status":"pending","source":null}}`.
`status` is `ineligible`, `pending`, `submitted`, or `skipped`.
Only show the survey when `eligible === true && status === "pending"`.
Existing answers survive migration as submitted, even for ineligible accounts.
GET never returns null data. This is an intentional contract update; deploy both clients together.

- Submit: PUT `{"source":"bilibili"}` (original request remains compatible).
- Skip/close: PUT `{"status":"skipped"}`; do not include source, even null.
- Submitted response has a source; skipped response has source null.
- First committed terminal response wins. Repeats and conflicting requests return the stored
  result, HTTP 200; clients must render the returned status/source rather than assume their request won.
  A skipped account cannot later submit, and submitted answers cannot be changed by this API.
- Identity is taken only from the verified Bearer token and database auth.uid(). No user ID in requests.

## Channels (unchanged)

| Value | Label |
| --- | --- |
| friend_colleague | 朋友或同事 |
| search | Google / 搜索 |
| x | X / Twitter |
| linkedin | LinkedIn |
| youtube | YouTube |
| github | GitHub |
| bilibili | B站 |
| douyin | 抖音 |
| xiaohongshu | 小红书 |
| other_social | 其他社交平台 |
| blog_newsletter | 博客 / Newsletter |
| ai_assistant | ChatGPT / Claude / Cursor |
| work | 在工作中接触到 |
| offline_event | 线下活动 / Meetup |
| dont_remember | 想不起来了 |
| other | 其他 |

## Errors and retry

Existing error envelope: `success:false`, `error:{code,message}`.
400 VALIDATION_ERROR: invalid JSON, missing/unknown source, extra fields, invalid skip body.
401 UNAUTHORIZED: missing, invalid or expired Bearer token.
403 FORBIDDEN: old, unconfirmed, anonymous or otherwise ineligible account; rollout disabled.
500 INTERNAL_ERROR/network error: retry safely with the same request. Never mark submission successful before 200.

Skip failures must not block app entry. Immediately retain an account-scoped local skip marker
and a pending skip request. Retry on authenticated app startup, network recovery, or renewed token,
using bounded exponential backoff (e.g. 1/2/4/8/30 seconds with jitter); do not retry 400.
Pause 401 retries until authentication refresh; discard pending request on 403, retain local suppression.
On 200 clear retry request and accept the returned terminal state (possibly submitted by another device).
Never send a queued skip under a different account. Until synchronization succeeds, another device
can still see pending; offline cross-device suppression cannot be guaranteed.

## Rollout and migration boundary

Apply `20261027110000_create_discovery_sources.sql` then `20261027120000_discovery_source_lifecycle.sql`.
If LOC-32 migration was already applied, apply only the latter. Existing channels are preserved.
Deploy remains disabled (`enabled_at IS NULL`). Release owner activates after frontend/backend are ready:

```sql
update public.discovery_source_rollout
set enabled_at = clock_timestamp()
where singleton = true and enabled_at is null
returning enabled_at;
```

Record this returned UTC timestamp. Activation is one-time: never advance it or backdate it.
Eligibility uses auth.users.created_at >= enabled_at, enabled_at <= database current time,
confirmed_at IS NOT NULL and is_anonymous false. A pre-boundary signup confirmed later stays ineligible.
No user metadata or client clock affects eligibility. Missing answer does not imply new account.
Pending is represented by eligible account + absent response row; terminal rows persist across devices.
Rollout settings have RLS enabled and no client grants; direct answer writes are revoked.
Only authenticated RPCs may finalize the response; RLS still limits direct reads to one's own row.
Deleting auth.users cascades. No free text, telemetry, photos, EXIF/GPS, routes or videos are accepted.

## Reproduce database verification (disposable database only)

From repository root, Docker available:

```sh
docker run --name loc34-postgres -e POSTGRES_PASSWORD=local-test-only -d postgres:17
docker cp packages/backend/supabase loc34-postgres:/tmp/survey
docker exec loc34-postgres psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/survey/tests/discovery-bootstrap.sql -f /tmp/survey/migrations/20261027110000_create_discovery_sources.sql -f /tmp/survey/migrations/20261027120000_discovery_source_lifecycle.sql -f /tmp/survey/tests/discovery-source.sql
node packages/backend/supabase/tests/discovery-concurrency.mjs
```

Wait for PostgreSQL readiness before psql. Bootstrap creates minimal auth.users/auth.uid and roles;
it is a test fixture, NEVER run it on Supabase or production. Permissions and concurrency run in
real PostgreSQL 17, not a mocked SQL engine. Use a fresh container on each run.
Stop/remove only this test container after verification: `docker rm -f loc34-postgres`.

## QA full-stack environment

In `packages/backend`, run `pnpm exec supabase start` and `pnpm exec supabase db reset`
against the local CLI stack (requires Docker; resets local test data). Obtain local URL/anon key
from `pnpm exec supabase status`; put them in backend `.env.local` as NEXT_PUBLIC_SUPABASE_URL
and NEXT_PUBLIC_SUPABASE_ANON_KEY. Configure frontend to the same local Supabase and backend URL.
Run `pnpm dev --port 1053` in backend. Create one account before activation and new accounts after,
confirm new accounts, activate with the SQL above via local database connection.
Use access tokens from this local auth service for GET, submit, skip, and invalid-token HTTP tests.
Check second-device GET after completion and frontend retry after disconnect/reconnect.
Never use production credentials for these steps.

## Evidence and limits (2026-10-27)

Executed: both migrations on isolated PostgreSQL 17; disabled/old/exact-boundary/unconfirmed/anonymous
eligibility; submit persistence, skip persistence/no source, terminal retries; invalid RPC payloads;
RLS cross-account read isolation, direct writes/rollout writes denied, anonymous RPC/read denied,
missing identity denied; delete cascade; 20 concurrent submit/skip calls return one identical row.
Executed: three Node validator tests, backend `tsc --noEmit`, changed TypeScript files ESLint (all pass).
Not executed: full local Supabase GoTrue/PostgREST HTTP stack, browser E2E, deployed migration or production tests.
QA must execute those full-stack cases; the PostgreSQL fixture does not validate JWT verification itself.
GitHub CLI credential is invalid; no PR was created.
