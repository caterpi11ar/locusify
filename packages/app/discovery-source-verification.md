# LOC-33 delivery and verification

## Completion feedback (v5, current)

Successful submission shows the supplied reference's green-check thank-you card,
with manual close and six-second auto-dismiss. Only a confirmed submitted result
while the survey is active triggers it. Failed save, skip, conflicting terminal
skip, refresh and late save after user dismissal do not produce false success.
The local preview's entire diagnostic toolbar was removed from HTML injection.

Passed: 14 state/API tests, TypeScript, changed-file ESLint. New browser check:
`node packages/app/test/discovery-browser/verify-completion.mjs output/viewport-tool`
against the isolated live preview on port 11833. Desktop 1440×900 and phone 390×844
checked PNG captures show the actual loaded map; no toolbar, no toast on failure,
exactly one toast on retry success, manual/automatic close and no repeat on reload
all passed. Evidence: `output/playwright/loc33-completion`.

The layout verifier also includes the earlier preview-check correction: import
the map store once, then synchronously poll loaded tiles and rendered features.
The old async polling callback did not reliably wait for imagery; the earlier
claims that v1-v4 captures showed a loaded map were incorrect. Corrected checks
passed in the subsequent live-preview run and now ship in the complete patch.

## No-backdrop revision (v4, current)

Removed the survey Overlay entirely. Also deferred announcement/help/feedback
while the survey is open: the existing announcement had its own black/blurred
mask underneath the survey. Presentation coordination is memory-only and does
not consume the announcement or onboarding seen flags. Original app background
and controls remain visible, without extra tint or blur outside the panel.

The six fixed viewport scenarios now assert zero fullscreen portal layers,
absence of the announcement during the survey and its return after Escape.
Existing icon, height, scroll, keyboard and PNG dimension checks still pass.
TypeScript and changed-file ESLint passed. Current artifacts:
`output/playwright/loc33-v4`. Earlier backdrop pixel checks below are historical
and superseded by the user's explicit no-mask requirement.

## Background revision (v3)

The black backdrop over the dark base reproduced at RGB(5,5,5), failing the
near-black-screen assertion in `verify-layout.mjs`. Replacing it with translucent
slate and reducing blur to 2px passed the same assertion across all 6 viewport
scenarios (sample RGB approximately 47–50,55–58,66–69). Phone/desktop captures now
also wait for the real map instance and its entrance opacity to settle. This
avoids capturing the initial dark loading/animation frame. No map imagery or
page background is fabricated for screenshots. Map-ready evidence is included
for these two scenarios; the other four validate the loading fallback as well.
TypeScript and changed-file ESLint passed. Existing compact height, scrolling,
icons, keyboard selection, skip handling and PNG dimension assertions still pass.
Artifacts are under `output/playwright/loc33-v3`.

## Viewport/icon revision after user review (v2)

The complete `loc-33-frontend-v5.patch` replaces all previous frontend patches;
apply it after LOC-34 on the same base below, not on top of v1. Includes all prior
frontend implementation plus the compact modal, 16 local icons and layout checker.

Used locusify-viewport v1.0.0's exact `contextOptions` and `checkedScreenshot`
helpers, copied into workspace `output/viewport-tool` and installed with locked
`npm ci --ignore-scripts --no-audit --no-fund`. Its own verifier passed 19 captures
and 2 negative cases. Application check command, from root with Vite on port 1053:

```sh
node packages/app/test/discovery-browser/verify-layout.mjs output/viewport-tool
```

Passed 6 fresh contexts: pc-1440 (1440×900), phone-360 portrait (360×800), phone-390
portrait (390×844, DPR 2), phone-430 portrait (430×932), phone-390 landscape
(844×390), tablet-768 portrait (768×1024). System Chrome 155.0.8059.85, Playwright
1.56.1; generic Chromium touch/mobile emulation, not a physical-device claim.
CSS-scale PNG dimensions, screen/layout viewport, DPR and visual scale were
checked; an intentionally wrong expected width was rejected before capture.

Mobile dialog measured heights: 544px at 360×800; 560px at both 390×844 and 430×932.
The 390px view decreased from roughly 760px in v1 to 560px. All 16 icon masks
rendered. Scrollable content reaches the last option while footer buttons remain
inside the dialog; keyboard selection, disabled empty submit and Escape skip pass.
Initial, selected and bottom-scroll screenshots were captured; no horizontal
overflow. TypeScript and changed-file ESLint passed. State/API code is unchanged
from the prior 12-test delivery. Machine-readable evidence: `dimensions.json`.

Base: `c355b568c5590e99998eb61f6622e455c28572dc`.
Apply LOC-34's **complete** `loc-34-backend.patch`, then `loc-33-frontend-v5.patch`
at repository root. Do not also apply the obsolete LOC-32 backend patch.
Frontend changes are confined to `packages/app`; backend files were imported
unchanged for integration, and are not duplicated in the frontend patch.
No PR or deployment was created by this delivery.

## Automated checks (passed, 2026-10-27)

After `pnpm install --frozen-lockfile`, from root:

```sh
pnpm --filter @locusify/app typecheck
pnpm exec eslint packages/app/src/components/auth/DiscoverySurvey.tsx packages/app/src/lib/api/discovery-source.ts packages/app/src/lib/discovery-survey.ts packages/app/src/layout/index.tsx packages/app/test/lib/discovery-survey.test.ts packages/app/test/lib/discovery-api.test.ts
pnpm --filter @locusify/app exec vitest run test/lib/discovery-survey.test.ts test/lib/discovery-api.test.ts
git diff --check
```

Executed equivalent direct Node CLI paths because sandboxed pnpm could not open
its database. Vitest needed to run outside the sandbox due to a Windows temporary
cache rename EPERM. TypeScript and changed production/unit-test file ESLint passed;
12 tests passed. They cover eligibility, transient ineligibility, account changes,
JWT/account mismatch, malformed responses, exact backend enum/request parity,
double clicks, failed submits, skip during pending submit, local outbox restoration,
storage failure, and 401/403 retry handling.

## Browser and actual backend route integration (passed)

Run three local processes in separate terminals, with fresh fixture state per run:

```sh
node packages/app/test/discovery-browser/supabase-fixture.mjs
pnpm --filter @locusify/app exec vite --host 127.0.0.1 --port 1053
```

Backend terminal (PowerShell):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:1055'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only-key'
pnpm --filter @locusify/backend exec next dev --hostname 127.0.0.1 --port 1054
```

From root, use a fresh browser session:

```sh
npx --yes --package @playwright/cli playwright-cli -s=loc33 open about:blank
npx --yes --package @playwright/cli playwright-cli -s=loc33 run-code --filename packages/app/test/discovery-browser/setup-survey.cjs
npx --yes --package @playwright/cli playwright-cli -s=loc33 snapshot
npx --yes --package @playwright/cli playwright-cli -s=loc33 run-code --filename packages/app/test/discovery-browser/verify-survey.cjs
npx --yes --package @playwright/cli playwright-cli -s=loc33 close
```

Stop the three local processes after checks. Browser checks passed:

- Unselected submit disabled; native radio arrow selection and single selection.
- Failed submit preserves selection; retry succeeds through actual Next GET/PUT,
  validator, auth guard, repository and response envelope.
- Bilibili, Douyin and Xiaohongshu all accepted.
- Escape immediately dismisses despite failed save; outbox synchronizes later.
- Account switches are isolated; server-ineligible account never opens.
- Refresh and clearing local completion marker restore terminal state from server.
- 320×568 scroll and footer action work; 390×844 single-column and 1280×900
  two-column screenshots visually inspected.
- Captured PUT bodies contain only `source` or `status`; no travel data or text.
- Actual unauthenticated backend endpoint returns 401.

Captured bodies: `{"source":"douyin"}` twice (failure/retry),
`{"source":"bilibili"}`, `{"source":"xiaohongshu"}`,
`{"status":"skipped"}` twice (failure/retry), `{"source":"other"}`.

## Limits / independent QA

This is browser → real Next route → **simulated local Supabase HTTP** integration.
The fixture deliberately does not verify JWT signatures or execute SQL. This does
not replace LOC-35's real Supabase Auth/PostgREST/database E2E, real registration/
email verification or cross-device acceptance. LOC-34 separately supplies real
PostgreSQL migration/RLS/concurrency evidence. No production requests or migrations
were made by the survey tests. Rollout remains disabled until the release owner
activates it. Skip suppression across devices is guaranteed only after sync.
An existing SEO React script-tag console error appeared independently of the
survey; injected 500 errors were expected. No new survey console exceptions.
## Current completion UI (v6)

DiscoverySurvey reuses FeedbackDialog's existing completed state through the
optional `completed` prop. The original feedback flow retains its default rating
form. Both use the same thank-you markup, translations, animation, close button
and 2-second automatic dismissal. The separate custom toast and duplicate locale
keys have been removed.

Validated: 14 controller/API tests, app TypeScript check, changed-file ESLint,
and fixed-viewport Chromium checks at 1440×900 and 390×844. Browser checks cover
failed submit (no success message), successful retry (one message), manual close,
automatic dismissal, and no repeat after reload. Screenshots use the viewport
skill's dimension validation. Auth/API remain synthetic local fixtures.
