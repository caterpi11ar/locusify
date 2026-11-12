# LOC-52 brand replacement

The approved source is `logo-source.png` (1254×1254), copied byte-for-byte from
the first LOC-52 attachment. SHA256:
`73b982cad7a0e9822abe687a70275d14513313358d57c8c78f8215e275da51d8`.
Its light background, whitespace, lettering and aspect ratio are intentional.

Run `python scripts/generate-brand-assets.py` with Pillow to reproduce the app/web
logo PNGs, favicon sizes, apple icon and app social image. No AI redraw, background
removal or alternate small icon is used. The 16px version necessarily has limited
wordmark detail; it retains the complete approved artwork.

## Coverage

| Surface | Files / treatment |
| --- | --- |
| App assets | `packages/app/src/assets/locusify.png`, `public/logo.png` (256²), `public/favicon.ico` (16/32/48/64/128/256²), `public/favicon-{16,32,48}.png`, `public/og-image.png` (1200×630) |
| Web assets | `packages/web/public/logo.png` (256²), `favicon-16.png`, `icon-light-32x32.png`, `favicon-48.png`, `apple-icon.png` (180²), `og-image.png` (1200×630) |
| App DOM | SplashScreen, AboutSection, ReplayIntroOverlay, TrajectoryStatsBar |
| Default avatar only | ProfileAvatar used by LoginButton, AccountSection, AvatarSetting, UserPanel and WaypointDot; current and previously persisted local asset URLs resolve to the current bundled artwork |
| Web DOM | Header and hero loading state |
| SEO | Existing app index/SeoManager 256² declarations retained; SEO page generator corrected from 1024²; web Organization JSON-LD explicitly declares 256² |
| PWA | Existing web manifest paths still resolve to replaced 180² / 256² assets; no app manifest or native-app project exists |
| README | Root English/Chinese and app English point at local tracked assets; app Chinese already did |
| Embedded old marks | App screenshots `02-hero-zh-1125x2436.png`, `08-more-zh-1125x2436.png`, `map.jpeg`, `vlog.png`; web `images/001.png`; web OG regenerated from the complete updated screenshot without cutting off the brand |
| Video | Web `videos/002.webm`: intro and stats logo replaced throughout all 248 decoded frames, including crossfade. 1280×572 / 30fps VP9, original Opus audio copied. No user-generated video was opened. |

DOM brand images use
`object-cover overflow-hidden rounded-[30%] [corner-shape:superellipse(1.45)]`.
They remain square and conflicting radius classes are removed. The radius remains
when `corner-shape` is unsupported. User avatars, preset icons and the QR code keep
their original styling. Backend files are excluded per the user's revised scope.

## Media audit and exclusions

- The remaining app screenshots `04-route-zh-1125x2436.png`,
  `06-vlog-zh-1125x2436.png`, `home.png` have no visible Locusify image logo.
  Cat/profile images are not brand logos.
- Web `images/004.png`, the 26 `travel-*.jpg` images and the external editorial
  hiking video have no observed Locusify logo (contact-sheet visual review).
  The editorial video was downloaded locally for inspection and remains unchanged.
- `placeholder-logo.svg` is an unused template asset, not the Locusify logo.
- Blog article OG endpoints render text, not the old image logo; they are unchanged.
- Google/GitHub/provider marks, support badges, map attribution and the QR image
  are excluded. Historical release notes and Git history are not rewritten.
- Already-published external assets, deployed caches and previously downloaded
  icons are not modified by this PR. Current README references no longer depend
  on the external assets repository.

## Validation and evidence

App/web production builds pass. Six avatar regression tests cover old local
fallback URLs, the current asset, and unaffected external/blob/data personal
avatars. Asset checks confirm source identity, exact proportional PNG resizing,
ICO decoding, existing manifest sizes, HTTP asset responses and compiled Tailwind
rules. Automated video checks and frame strips inspect the replaced regions.

The complete downloadable report, route index and screenshots are attached to
LOC-52 and identify the tested commit. Fixed viewports are desktop 1440×900 and
mobile 390×844, DPR 1, system Chrome/Chromium. Full-page heights are measured,
not resized. `test/brand-browser/states.html` is a development-only fixture of the
actual splash/intro/stats/waypoint components, never a production route.

Evidence explicitly distinguishes real routes from isolated component states.
App accounts and map states are synthetic; external traffic is blocked during
capture. Real OAuth, password-reset submission, permission-driven recording,
physical devices and unsupported-browser rendering are not certified here.
Independent QA is required before user acceptance.
