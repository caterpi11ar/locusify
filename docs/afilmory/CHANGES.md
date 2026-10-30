# LOC-40 local source reuse record

Upstream: `c392e065b03977fbe5fe256eb902121f0e4cdb30`. Copyright (c) 2025 Afilmory Team. Project Code is AGPL-3.0-or-later plus upstream section 4 attribution. See LICENSE and dependency-licenses. This is source reuse with necessary adaptation, not an unchanged whole-page copy.

| Target | Status | Reason |
| --- | --- | --- |
| `packages/app/src/features/afilmory/map/ui/MapLibre.tsx` | adapted | Use local whole-world GeoJSON style, bundled worker, existing bounds utility; local map controls without geolocation; keep upstream bounds/view/cluster rendering; cap zoom for low-resolution map; error status; separate close callback; local attribution; repo formatting. |
| `packages/app/src/features/afilmory/map/ui/shared/clustering.test.ts` | adapted | Local type; remove unsupported public-manifest fixture fields; Vitest runner and repository formatting. |
| `packages/app/src/features/afilmory/map/ui/shared/clustering.ts` | adapted | Local PhotoMarker type import and repository formatting; clustering algorithm retained. |
| `packages/app/src/features/afilmory/map/ui/shared/photo-marker-card-behavior.test.ts` | adapted | Vitest runner and repository formatting. |
| `packages/app/src/features/afilmory/map/ui/shared/photo-marker-card-behavior.ts` | adapted | Repository formatting only if changed. |
| `packages/app/src/features/afilmory/map/ui/shared/types.ts` | adapted | Local PhotoMarker type import and repository formatting. |
| `packages/app/src/features/afilmory/gallery/Masonic.tsx` | adapted | Bind scrolling to local container; subtract container offset; memoize resize observer; repo lint/import formatting. Retains copied Masonic hook notice and positioning/virtualization core. |
| `packages/app/src/features/afilmory/gallery/MasonryView.tsx` | adapted | Replace Jotai settings with auto columns and local responsive adapter; use Locusify padding and 8px gutters; local manifest type; repo formatting. |
| `packages/app/src/features/afilmory/gallery/MasonryPhotoItem.tsx` | adapted | Bind local viewer, paired blob video, placeholder and existing icon components; no cloud converter or upstream EXIF formatter; keyboard activation; no sensitive logging; repo formatting. |
| `packages/app/src/features/afilmory/shared/viewer/contracts.ts` | adapted | Repository formatting only if changed. |
| `packages/app/src/features/afilmory/map/ui/shared/PhotoMarkerPin.tsx` | adapted | Bind existing local UI imports; replace photo-ID URL with local detail callback; responsive anchored-card width and keyboard activation; preserve upstream anchored-card behavior; repo formatting. |
