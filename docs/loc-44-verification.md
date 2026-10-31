## LOC-44: scrolling and cross-page navigation

Base: `4c83fec43c32003a02a834300d9019a8972c8fb1`. Changes preserve all existing imagery, section heights and animation design.

### Fixed

- The home page's `overflow-x-hidden` implicitly creates a vertical scroll container (`overflow-y: auto`). Its GPS, technology and gallery sticky descendants therefore scroll away while their reserved height remains. `overflow-x-clip` clips horizontal animation without creating that scroll container.
- Header (desktop/mobile) and footer section links now target `/#section` through the existing next-intl Link. Content pages return to the same-language home page; home-page anchors continue to work.

### Verification

Local Windows / Edge 156.0.4314.56, Chromium layout emulation, DPR 1. Desktop 1440×900; mobile 390×844 (not real iOS/Safari). Only public imagery and empty anonymous sessions were used.

- Before: at section top + 500px, all three sticky tops were approximately -500px, both viewports. Blog Features href was `#features`.
- After: the same six sticky measurements are 0px. English blog Features href is `/en#features`.
- Reusable check: `python tools/verify/web-layout.py --base http://localhost:3053 --channel msedge`. Requires Python Playwright as used by the existing verification tools. Covers both languages, three sticky sections, horizontal overflow, same-page anchors, and content-page navigation.
- Changed-file ESLint, web TypeScript and Next production build passed (81 generated pages).
- Final screenshots are attached to the Multica issue, with JSON dimension records and HTML index. They show the local production build at localhost:3053; the embedded app still uses the production app origin. Separate guest screenshots use the local Vite app at localhost:1046. Diagnostic/failed development captures are excluded.

### Guest demo dependency (not fixed)

There is no guest query handler in the current app source. `packages/web/components/sections/hero-section.tsx` embeds `/?mode=guest`, but `packages/app/src/routers/index.tsx` redirects `/` to a language path without search parameters. Preserving that query alone cannot restore a demo:

- `MapSection.tsx` initializes and reopens LoginDrawer whenever there is no user.
- LoginDrawer is not dismissible for anonymous users.
- Map interactions and several controls are gated on the authenticated user.
- Existing generated demo photos are part of authenticated onboarding, not a separate anonymous route.

No authentication gates, permissions, backend contracts or app routes were changed. Product must specify/confirm an isolated anonymous demo contract and coordinate design/backend as needed. This PR addresses the independent layout/navigation defects; it does not claim the guest acceptance criterion is met. Release and independent QA remain separate handoffs.
