## Marketing asset manifest — LOC-44

Captured 2026-10-31 from the actual local Locusify app, source `4c83fec43c32003a02a834300d9019a8972c8fb1` (no app code changes). Edge 156.0.4314.56, Playwright 1.56.1, DPR 1. Website assets are in `packages/web/public/images/product/`.

### Source and correspondence

Three original procedural landscape illustrations were generated for this task with Pillow drawing primitives. They are synthetic illustrations, not claimed photographs of the assigned coordinates. No downloaded stock photographs, AI-generated product UI, personal photos or real travel histories were used. These original task-created images may be reused with the repository's marketing assets.

Recreate the fixtures from the repository root with `python tools/verify/generate-marketing-samples.py` (Pillow required). `loc-44-assets.json` records the delivered dimensions and SHA-256 of each asset.

| Input | Synthetic EXIF GPS | Synthetic capture time (UTC) |
| --- | --- | --- |
| `sample-lake.jpg` | 46.4500 N, 6.5500 E | 2026-04-10 09:00 |
| `sample-ridge.jpg` | 46.4800 N, 6.6500 E | 2026-04-11 09:00 |
| `sample-sunset.jpg` | 46.5000 N, 6.7500 E | 2026-04-12 09:00 |

All import, map, replay and export captures use these same three files in this order. The actual file picker, EXIF parser, route creation, replay timeline and video recording flow were exercised. The replay still shows the second waypoint (ridge); the video preview is from a locally generated recording, not an invented result. The website does not serve an autoplay video.

### UI assets

`zh` and `en` filenames refer to app routes `/zh-CN/` and `/en/`. The existing app may generate a Chinese decorative quote even in the English interface; it was preserved as rendered, not edited into the screenshot.

| Filename pattern | Use and actual UI state | Native dimensions |
| --- | --- | --- |
| `{zh,en}-desktop-replay.png` | Hero and results; actual map, photo panel, route and replay timeline at waypoint 2 | 1440×900 |
| `{zh,en}-mobile-landscape-replay.png` | Separately captured touch/mobile replay in a tall landscape layout; the app requires landscape for replay | 844×700 |
| `{zh,en}-mobile-import.png` | Step 1; all three images selected and GPS detected, before Create Route | 390×844 |
| `{zh,en}-mobile-map.png` | Step 2; route-created prompt and three photo markers | 390×844 |
| `{zh,en}-mobile-export.png` | Step 3; actual locally generated video preview and Export button, in a tall landscape layout to keep the whole modal visible | 844×700 |
| `{zh,en}-desktop-{import,map,export}.png` | Supplemental actual desktop source states retained for review | 1440×900 |

Images preserve native aspect ratios. Mobile screenshots are separate app viewport captures, not resized desktop screenshots. Replay/export use an explicitly custom 844×700 touch/mobile CSS viewport, screen 844×700, DPR 1; this is a framing simulation, not a claimed device preset. The standard 844×390 landscape cut off the export modal, and 390×844 portrait showed the app's rotation guard. No guard was hidden or removed. The full-size link opens the selected responsive source. Website acceptance screenshots use 1440×900 and 390×844 throughout; asset capture orientation is distinct from website viewport testing.

### Map and product source

Map pixels are rendered by the app's existing CARTO Dark Matter style (`packages/app/src/pages/map/MapLibreStyleDark.json`). Source: [CARTO attribution](https://carto.com/attributions), [OpenStreetMap copyright and ODbL attribution](https://www.openstreetmap.org/copyright). Every displayed product screenshot has adjacent CARTO/OpenStreetMap attribution links. Locusify UI is captured from this repository, not redrawn.

### Isolation and privacy

Capture uses the repository's existing DEV-only `window.__locusify` test bridge and local mocked `/api/v1/` account/subscription responses (free plan). All API requests in the capture browser are intercepted locally; no real login, account mutation or photo upload is performed. Map tiles load through the app's existing public provider. Authentication and authorization source code are unchanged. Synthetic files, GPS, routes and generated recordings remain on the capture device; only the explicitly synthetic marketing screenshots/illustrations are committed and attached.

This manifest documents provenance and actual capture states; product composition acceptance and independent QA remain required. No production deployment is claimed.
