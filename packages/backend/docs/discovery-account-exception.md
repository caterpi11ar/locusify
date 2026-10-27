# Single-account survey exception

This additive delivery implements the LOC-35 request for the account explicitly
authorized in the issue thread. It does not activate any account on installation.
No password, token, or live session is included. No production mutation was made.

Apply to clean baseline `c355b568c5590e99998eb61f6622e455c28572dc`:

1. `loc-33-integrated-v7.patch`, SHA256 `ce1429f9d44e1b58eb3a853a82faacc18eb2bddd461d569ca5ce6d6795eafc86`.
2. `loc-35-account-foundation.patch`, SHA256 `823D31E60C2777F3E1E7975EFFEA287B9A1EDB598DBC0659B14222874005BE03`.
3. `loc-35-discovery-exception.patch` from this delivery.

The foundation migration is for empty databases; reconcile already-existing
production tables as described in its own runbook. Do not replay it blindly.
The new exception migration depends on the existing discovery lifecycle RPC.

## Behavior

An operator-only table in the non-exposed `discovery_private` schema holds at
most one UUID. An exception can last at most 24 hours; the supplied activation
script grants one hour. Public, anonymous, authenticated, and service-key API
roles cannot read or write it. There is no self-service grant endpoint.

Only the registration-time eligibility condition is relaxed for that UUID.
Global rollout must already be enabled, and the user must be confirmed and
non-anonymous. Other old accounts remain ineligible; new-account rules are
unchanged. Existing `submitted`/`skipped` answers are never deleted or reset.
The existing unique answer row and first-write-wins RPC enforce one terminal
response across sessions and concurrent requests. GET does not consume the
exception: "once" means one completed or skipped survey, not exactly one render
across simultaneously open tabs. Pending surveys may reappear until a terminal
response is synchronized. The existing offline skip limitation still applies.

## Release activation

1. Record the previous frontend/backend deployment IDs. Deploy the fixed paired
   versions and apply reviewed database migrations with rollout still disabled.
2. Verify the real deployed GET/PUT interfaces and disabled eligibility. Migration
   installation alone must leave the exception table empty.
3. When both deployments are ready, enable the normal rollout using the existing
   documented database-time operation. Never backdate `enabled_at` or edit user
   creation time. The exception script itself does not change either value.
4. Using an operator database connection, run from `packages/backend`:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v paired_deployment_ready=true -v target_email="$AUTHORIZED_TEST_EMAIL" -f supabase/operations/grant-discovery-exception.sql
```

Supply only the account authorized for this verification; no personal address is
embedded in the repository. The script resolves the authorized email to exactly one confirmed non-anonymous
Auth UUID, refuses an existing answer, and returns UUID/grant/expiry timestamps.
Retain that UUID privately for cleanup. A missing/ambiguous account, disabled
rollout, unconfirmed readiness, existing grant, or existing answer aborts the
transaction. A retry does not extend the grant. No application login credential
is needed to execute this operator operation. Do not put connection secrets in
comments or attachments.

5. Log in normally as the authorized account and verify GET reports
   `eligible=true,status=pending`. Confirm another old account remains ineligible.
   Submit or close/skip normally; verify the same terminal state after refresh
   and re-login. Do not pre-write an answer or inject a session as proof of UI E2E.
6. Immediately revoke after the targeted verification, or to cancel before it:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v target_uuid=<captured-UUID> -f supabase/operations/revoke-discovery-exception.sql
```

Revocation is idempotent and removes only that grant. A pending old account becomes
ineligible on its next request. Already rendered UI may remain until it refetches;
a subsequent PUT is denied if eligibility has expired or been revoked. A terminal
answer remains terminal and must be kept. Expiry also denies access automatically;
delete the expired grant using the same cleanup script. Retain the inert empty
table/migration when rolling application deployments back. No global rollout
change is required to revoke this exception.

## Verification and limits

Executed against isolated PostgreSQL 17 with minimal Supabase Auth/role fixtures:
`supabase/tests/discovery-exception.sql` (transaction rolls back) verifies disabled
rollout, target-only eligibility, anonymous/unconfirmed denial, expired/revoked
grant denial, protected schema, submit/skip persistence, first-response wins,
cleanup preserving answers, and Auth deletion cascade. The supplied operator
scripts were also executed against a synthetic account in that container: false
readiness/disabled rollout/duplicate grant/existing answer are rejected; grant
and UUID revocation succeed; 20 concurrent submit/skip calls agree on one result.
The test container was stopped afterward.

Not executed: live account grant, production SQL, deployed Supabase Auth/PostgREST,
browser rendering of the exception, or paired Vercel release. Those remain
Release/independent acceptance steps once deployment access is restored.
