# LOC-49 verification

The promotion redesign has been withdrawn at the user's request. The banner, header, site header, hero layout and promotion translations are restored to baseline `030f9f8`. Only the following responsive override remains: below 1024 CSS px, hide the promotion and put navigation at its original no-banner top position (12px). This covers all phone portrait/landscape presets and narrow tablets. At 1024px and above the original promotion and styling are preserved.

The original promotion behavior is restored as well; the previous redesigned clipboard/error/focus behavior and 52px layout are no longer part of this PR. Earlier screenshots and reports of those versions are superseded.

## SEO and 404

Home-specific metadata lives on the home page instead of the locale layout, preventing missing pages from inheriting its canonical and sharing URL. Existing blog, topic, post and privacy metadata, robots and sitemap remain intact. Localized 404 content has a home recovery action and no promotion. Unknown extension paths are covered by locale middleware. The existing global fallback is retained.

Prior local production verification checked all 74 sitemap URLs for HTTP 200, title, description, canonical and sharing metadata, and eight invalid path cases for 404/noindex/no canonical. Those SEO/routing files were not changed in this rollback. The updated browser script checks bilingual 404 content alongside each viewport.

## Reproduce the current version

```sh
pnpm install --frozen-lockfile --filter @locusify/web...
pnpm --filter @locusify/web build
pnpm --filter @locusify/web start --port 3149
```

In another terminal:

```sh
npm ci --prefix packages/web/scripts/loc49
node packages/web/scripts/loc49/acceptance.mjs
```

The browser script launches system Edge with Playwright 1.56.1. It uses the locusify-viewport v1.0.0 `contextOptions` and `checkedScreenshot` helpers, DPR 1, default zoom, and CSS-scale PNG dimension validation. It covers all 15 standard viewports in both languages: hidden banner/no visible controls and header top 12px below 1024px; original visible banner/header top 48px on wider screens; desktop copying/closing/reload memory; bilingual 404. Only synthetic codes are captured. External requests are blocked.

Current captures and dimensions are written to `output/playwright/restored/`. Production build includes TypeScript. Compare baseline files with `git diff 030f9f8 -- packages/web/components/announcement-banner.tsx packages/web/components/site-header.tsx packages/web/components/header.tsx packages/web/components/sections/hero-section.tsx`; this must be empty.

## Handoff limits

Real Safari, physical devices and iPhone Duo remain unverified. Independent acceptance belongs to LOC-50. Release must repeat HTTP status, indexing, CDN/rewrite and static asset checks against the deployed host. No deployment, CI, backend or photo-processing changes were made. Photos, EXIF GPS, routes and generated videos remain on the user device.

Next's experimental global-not-found application fallback remains enabled. The middleware public-file exclusions need updating when adding new root public assets. Existing middleware deprecation warning remains.
