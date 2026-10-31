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
