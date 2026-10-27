# Real API integration handoff

This version combines the LOC-34 backend unchanged with the latest LOC-33 UI.
No mock bootstrap or preview middleware is part of the deployable sources.

## Configuration

Set app `VITE_API_BASE_URL` to the deployed backend origin (no `/api/v1`
suffix). Default is `https://api.locusify.cn`. Development and Vite preview
proxies now read the same value as production requests and OAuth. Rebuild the
app when changing this value. Google/GitHub authorization navigates directly
to that backend; survey requests use the signed-in account's Bearer token.

Backend configuration must be supplied securely by Release:

- `NEXT_PUBLIC_SUPABASE_URL=https://dnpxwowhdgwlzhjoxtkx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: matching project key
- `SUPABASE_SERVICE_ROLE_KEY`: backend only, required by other account routes
- `FRONTEND_URL=https://app.locusify.cn` (or the exact candidate frontend origin)
- `ALLOWED_REDIRECT_URIS`: exact full callback URLs, including `/auth/callback`;
  origins alone do not pass `lib/redirect.ts`. No wildcard is needed.
- Supabase OAuth redirect allow-list must allow the actual backend
  `/api/v1/auth/callback`; verify candidate origins before login.

`FRONTEND_URL` also governs production CORS. App Vercel rewrites already serve
`/auth/callback` and `/reset-password` as SPA routes. This turn did not change
remote OAuth providers, Vercel environment values or Supabase rollout state.

## Local real-backend entry (requires secure backend environment)

From the repo, start backend `pnpm --filter @locusify/backend exec next dev --port 1053`.
Set app `VITE_API_BASE_URL=http://localhost:1053`, then
`pnpm --filter @locusify/app dev`; entry is `http://localhost:1046/zh-CN/`.
Set backend `FRONTEND_URL=http://localhost:1046` and allow
`http://localhost:1046/auth/callback`. This is a startup recipe, not an already
running or authenticated service. Do not use the 11833 synthetic preview.

## Verified in this turn

- App production build (TypeScript, Vite, localized SEO pages): pass.
- Backend production build: pass; route list includes `/api/v1/discovery-source`.
- Built Next server: unauthenticated GET and PUT return structured 401;
  configured frontend Origin receives the expected CORS header. No Supabase
  requests or database writes are needed for this unauthenticated check.
- Fourteen survey controller/API regression tests: pass; changed configs lint.
- Existing warnings: app chunks above 500 kB; Next middleware convention deprecated.

## Remaining deployment/authentication gate

This checkout has no backend `.env.local` or supplied authenticated test session.
Thus authenticated GET (`eligible=false`), valid authenticated PUT (403), OAuth
round-trip and signed-in map entry have NOT been verified against Supabase here.
Previous synthetic checks are not evidence for these cases. Release must deploy
this fixed artifact with project configuration first, provide paired frontend/
backend URLs and rollback deployment IDs, and perform the disabled-state checks
with a controlled real account before coordinating independent QA. A 404 at the
old production URL is a deployment gap, not evidence this route is absent in the
new build. Leave `enabled_at` unchanged until the agreed release boundary.
