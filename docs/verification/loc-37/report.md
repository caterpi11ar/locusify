# LOC-37 — button feedback shape

## Change

Removed internal `rounded-full` from nine controls in `MapControls.tsx`, `MapMenuButton.tsx`, and `LoginButton.tsx`.

- Standalone controls inherit the existing glass shell radius.
- Zoom-in inherits only the top corners; zoom-out inherits only the bottom corners. The shared shell still clips feedback, and the divider remains straight.
- Keyboard focus uses a 2px outline with a -2px offset so it remains inside the clipped shell.
- Button dimensions, handlers, avatar shapes and genuinely circular standalone controls are unchanged.

## Verification — 2026-10-28

- App TypeScript: `node ../../node_modules/typescript/bin/tsc -b --noEmit` passed.
- ESLint on all three modified files passed; `git diff --check` passed.
- Actual React components were mounted in a temporary local Vite fixture with their Motion, Map and Tooltip providers. This is component-browser verification, not a full authenticated map workflow or independent QA.
- System Chrome 155.0.8059.85, Playwright 1.64.1: desktop 1440×900 and generic touch/mobile 390×844, DPR 1. `locusify-viewport` checked the viewport and decoded PNG dimensions. This is not physical-device or Safari coverage.
- Hover and pointer-down retain the expected radii. Independent controls compute to 16px, matching their shells; zoom corners compute to `16px 16px 0px 0px` and `0px 0px 16px 16px`.
- Keyboard focus computes to 2px, offset -2px and `:focus-visible`. Menu keyboard activation, mobile upload/login callbacks and replay-exit callback passed.
- Original `MapControls.tsx` was temporarily restored from HEAD: the same browser check failed on the first zoom button (`3.35544e+07px`, the computed fully rounded radius, versus the expected top-only corners). The fixed file was restored in `finally`; the complete check then passed again.
- Screenshots and machine-readable results are attached to LOC-37. Only synthetic component state was used; external browser requests were blocked.

## Limits

No full map geolocation/zoom integration, real-device testing, or independent QA was performed. The normal app shell also emitted an existing React script-tag warning during startup; the focused fixture avoids unrelated app initialization. GitHub CLI authentication was invalid during delivery, so no PR is claimed.
