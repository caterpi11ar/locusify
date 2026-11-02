# LOC-49 verification

## Changes and SEO audit

| Surface | Before | After / verification |
| --- | --- | --- |
| Home, Chinese and English | Title, description, canonical, language alternatives and social metadata lived in the locale layout | Same home metadata lives on the home page, so missing routes cannot inherit a home canonical or sharing URL |
| Blog index, topic, post and privacy pages | Already supplied page-specific title, description, canonical and sharing metadata | Preserved; all 74 sitemap URLs return 200 with nonempty title/description, matching production canonical, OG title and Twitter card |
| robots.txt / sitemap.xml | Existing public-only sitemap and production origin | Preserved; checked `https://locusify.cn`, no query parameters, sitemap advertised by robots |
| Missing routes | English-only UI, external secondary CTA, inherited home metadata; extension paths skipped locale middleware | Localized 404 title and content, only home recovery, no canonical, noindex, direct access and refresh return 404 locally |
| Promotion | Fixed banner, nowrap code, absolute 28px close target, success-only clipboard flow | Flow layout, wrapping raw code, separate 44px close column, minimum 44px copy target, pending/success/error feedback, focus restoration and optional session storage |
| Header | Assumed fixed banner height; tablet navigation crowded; menu could exceed viewport | Home-only sticky flow mode, large-screen desktop navigation, scrollable short-screen menu; content pages retain fixed mode |

No new product claims, structured data, uploads or telemetry were added. Existing public site metadata and schema were retained. Photo bytes, EXIF GPS, routes and generated videos are not involved in these changes or tests.

## Reproduce

From the repository root:

```sh
pnpm install --frozen-lockfile --filter @locusify/web...
pnpm --filter @locusify/web build
pnpm --filter @locusify/web start --port 3149
```

In another terminal, install the isolated verifier dependencies and run the scripts. Microsoft Edge must be installed; the scripts explicitly launch the `msedge` channel.

```sh
npm ci --prefix packages/web/scripts/loc49
node packages/web/scripts/loc49/acceptance.mjs
node packages/web/scripts/loc49/extra.mjs
```

Output: `output/playwright/` with screenshots, `dimensions.json` and `extra.json`. The verifier uses `contextOptions` and `checkedScreenshot` from locusify-viewport v1.0.0 (vendored with repository formatting only). Playwright 1.56.1 / pngjs 7.0.0 are locked separately. No Playwright test runner is required. It blocks non-local browser traffic, substitutes only synthetic codes in locally served documents, and asserts copying the exact synthetic string. No production redemption code is saved in test assets.

## Results (2026-11-02)

- Production build including TypeScript passed. Scoped ESLint and `git diff --check` passed. Existing Next.js middleware deprecation warning remains; migration is outside this change.
- Chromium engine, system Edge 156.0.4314.58, headless, Playwright 1.56.1. CSS-scale PNG, DPR 1, default zoom, mobile/touch options supplied by each preset. This is browser layout emulation.
- All 15 standard presets × both languages × short and 137-character synthetic codes passed open, successful copy, rejected copy, absent clipboard, close/focus, and session reload tests. Each state is captured with PNG dimension validation. Menus and bilingual 404 pages are captured per viewport.
- Both languages of blog index and privacy pages checked at all 15 presets, including navigation geometry and horizontal overflow.
- Additional checks: storage read/write denial, pending copy deduplication, resolution after close, Tab/Enter/Space, 639/640px widths, 200% root text sizing, continuous orientation changes preserving state. The font-size check is text enlargement, not a claim of OS accessibility or browser zoom coverage.
- `/missing`, `/en/missing`, invalid Chinese/English blog slugs, invalid blog topic, unknown locale path, and Chinese/English `.txt` paths returned HTTP 404 on initial navigation and refresh, with localized title/h1, noindex, no canonical. Recovery links were clicked successfully.
- The helper's own verifier passed 19 captures (including DPR 2 / full-page scenarios) and rejected intentionally wrong dimensions. The obsolete helper error text for an unsupported Duo preset does not establish any real-device coverage.

## Limits and Release / QA handoff

Real Safari, physical devices and iPhone Duo browser profiles remain **unverified**. Independent acceptance belongs to LOC-50. The tests block external embeds/analytics, so embedded application content is not a tested surface.

Release must repeat the invalid-path matrix against the deployed host, including direct navigation, reload, HTTP 404, noindex, canonical absence, CDN/rewrites, sitemap and static assets. Local `next start` results do not certify Vercel/CDN behavior. No CI, Vercel configuration or deployment was changed. `experimental.globalNotFound` is enabled in Next's application configuration for a full-document fallback; normal localized missing routes use the catch-all and locale boundary. Check this fallback during framework upgrades. The middleware's explicit public-file exclusions must be updated when adding new root public assets.

Next.js semantics reference: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
