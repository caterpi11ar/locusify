# Account foundation: LOC-35 B1

## Fixed candidate

Apply to baseline `c355b568c5590e99998eb61f6622e455c28572dc` in this order:

1. Existing complete `loc-34-backend.patch` (SHA256 `E2A6AA5B60CB00C776C033B3F67DA7CBBBA7AF865082B8C3C75FC3CF4B28D3BB`).
2. Existing complete `loc-33-frontend-v6.patch` (SHA256 `66745BF55CD9819C8A52FD74CB5E01BEF06ABEB0D7573B9F3FE04180EB2C26EE`).
3. `loc-35-account-foundation.patch` from this delivery. This is an incremental patch, not a replacement for either complete patch.

## Cause and fix

The backend migration directory omitted the tables required by `provisionUser`.
The legacy `packages/app/supabase/migrations/001_init.sql` is not applied by the
backend Supabase project and uses obsolete subscription plan/status values.
Do not apply that legacy script as a workaround.

The new backend migration creates `profiles` and `subscriptions` with the current
backend contract (`free/pro/max`, `active/canceled/expired/past_due`). Account
creation remains in the existing server-side provisioning flow. No Auth trigger
or backfill is introduced. Repeated provisioning uses the existing unique keys
and does not overwrite an existing subscription. Service-role writes remain
server-only; authenticated users can read their own rows and update only their
profile's display name, avatar URL, and update timestamp. Subscription writes
are denied to client roles. Deleting the Auth user cascades through both tables.

This migration deliberately fails transactionally if these tables already exist;
it must not silently accept an unknown or legacy schema. It targets the empty
local environment reported in B1, including one where survey migrations already
ran. Existing production schemas require inspection/reconciliation before any
deployment. No production operation was performed. Other legacy feature tables
(redemption, usage, feedback, payment provider mappings) are outside this fix.

## Reproduce locally

Use an isolated checkout and an unused Supabase project ID/port range. Commands
below are run from `packages/backend`, using Supabase CLI 2.122.0 and Docker.
Configure local ports if Windows reserves 54322 (QA previously used 18320–18329).

```sh
supabase start
# For an already-running DISPOSABLE local instance only:
supabase db reset --local
```

Both commands apply `packages/backend/supabase/migrations` automatically. Do not
run reset against a database with data to preserve. No seed rows are required:
normal authenticated signup/signin/OTP/callback calls `provisionUser`. Do not
pre-create a synthetic profile to bypass the registration test.

Check that `public.profiles` and `public.subscriptions` exist. Run the regression
against your local database connection (never a production URL):

```sh
psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/account-foundation.sql
```

Expected final row: `account foundation PASS`; fixtures roll back. Configure the
backend's Supabase URL, anon key and server-only service-role key from this local
stack. Point the frontend API proxy to this backend, not the default remote API.
Follow `discovery-source.md` to enable the survey using database time **before**
registering the test account. Existing accounts are intentionally not made eligible.

Retest ordinary app signup, confirmation (enable local email confirmations when
testing pending verification), profile and subscription reads, signout/signin,
and the survey flow. No manually seeded session can substitute for this test.

## Verification performed

On 2026-10-27, an isolated `postgres:17` container with minimal Supabase role/Auth
schema fixtures reproduced `relation public.profiles does not exist` using the
regression above. Applying all four backend migrations in filename order then
passed the same regression. Verified service-role provisioning, duplicate
provisioning preserving a paid plan, current enum compatibility, own-row RLS,
blocked entitlement/protected-column writes, allowed profile update, anonymous
read denial, and Auth deletion cascade. The container was stopped after testing.

This is real PostgreSQL SQL/RLS validation with an Auth fixture, **not** a new
Supabase Auth/PostgREST or browser E2E pass. The independent report's normal
registration/confirmation/re-login and remaining UI cases still need rerunning.
No change to the survey contract, eligibility boundary, or offline synchronization
limitation is included.
