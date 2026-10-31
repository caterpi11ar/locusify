## LOC-44: concise homepage and real product imagery

The current issue revision supersedes the original keep-all-imagery/restore-iframe scope. The first commit fixed sticky containment and localized links; the final version replaces the long scenes with natural document flow.

### Final changes

- Homepage order: product hero, three-step workflow, corresponding sample/results, compact privacy statement, unchanged pricing, FAQ, final CTA/footer.
- Removed the login iframe, long gallery, six audience cards, six standalone feature cards, statistics, repeated brand imagery and large tutorial section. Removed their component files, sticky code and scroll-height placeholders.
- Hero/results show actual app screenshots. Import/map/replay/export assets use the same three original synthetic EXIF samples. See `loc-44-assets.md` for source, coordinates, state, dimensions and capture isolation.
- Header/footer links resolve to retained sections on the same-language homepage. Legacy features/technology/gallery IDs now identify workflow/privacy/results; scenarios maps to the results section. Blog and privacy links remain available.
- Pricing plans, prices, rights and FAQ promises are unchanged. No authentication/backend code changed. Static screenshots are explicitly labeled; mobile replay is accurately described as landscape.

### Verification

Run `python tools/verify/web-layout.py --base http://localhost:3053 --channel msedge` with the existing Python Playwright setup. It checks Chinese/English at 1440x900 and 390x844, the six-section/three-step structure, absence of iframe/sticky placeholders, loaded hero image, overflow and same-/cross-page anchors.

Final screenshot attachments contain page-by-page CSS-scale captures and JSON/HTML indexes from a local production build. They are not production deployment screenshots. Public/synthetic data only. Local build, changed-file lint, TypeScript and browser results are reported in the issue/PR. Independent QA and Release deployment remain separate.

### Historical guest finding

The app root redirect drops query parameters, and direct language guest paths still show mandatory login because the app has no guest handler. Under the updated product scope the homepage iframe was removed; restoring anonymous app permissions is no longer an acceptance condition. No gates were weakened.
# LOC-46 follow-up verification — 2026-10-31

F1/F2/F3 addressed on top of `9719d868`, continuing PR #96 and branch `agent/locusify-frontend/28056280225b`.

- F1: announcement title wraps; copy/code and close occupy separate flex space. Header clears the taller mobile announcement. Before fix, `regression.mjs` failed copy and language assertions for both languages; after fix both pass. Final production checks verified bounds, normal click, exact clipboard value `LOCUSIFY-MAX-BETA`, localized copied feedback, close, and no header overlap.
- F2: ten lossless, independently captioned real-UI detail crops replace shrunken replay/export images at narrow widths. The original 19 files are unchanged; source rectangles/hashes and purposes are in the asset manifests. Mobile detail scale is at least 87%, compared with 40% before. Visual review at 390×844 confirms the photo, route marker, active timeline, play button, ready state, preview, Export and Discard are discernible. Full originals remain linked. Product/QA composition acceptance is still independent.
- F3: header, mobile menu, pricing, footer and hero use one locale-aware URL builder preserving query/hash. Actual link clicks were redirected only in the test browser from the app domain to the unchanged local app. English website + Chinese browser lands at `/en/`; Chinese website + English browser lands at `/zh-CN/`. No production authentication was exercised.

Validation: `pnpm --filter @locusify/web build` (including TypeScript), changed-file ESLint, and `git diff --check` passed. Final `acceptance.mjs`: 50 checked PNGs and 48 checks passed. Screenshots comprise four first-load, four copied-state, 40 stable homepage screens (desktop 8 per language, mobile 12 per language), and two mobile menus. Homepage/blog/privacy navigation and six retained/legacy anchors pass. No visible broken images, horizontal page overflow, or consecutive empty screens. Pricing/FAQ translation objects, app and backend source remain unchanged.

Environment: local production web build at localhost:3045; unchanged Vite app localhost:1046; Edge 156.0.4314.56 / Playwright 1.56.1, Windows, CSS 1440×900 and 390×844, DPR 1, scale 1. `locusify-viewport` v1.0.0 checked every PNG; its 19 scenarios and two negative cases passed. Browser scripts, baseline failure, final indexes/results and full-size screenshots are attached to the issue. Contact sheets are only an index, not substitute evidence. Generic Chromium touch emulation, not physical-phone/Safari certification. Existing Next middleware deprecation remains. No production deployment or CI outcome claimed.

---
