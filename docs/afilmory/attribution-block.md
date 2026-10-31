The main map attribution anchor is copied from `apps/web/src/components/ui/map/MapLibre.tsx` at Afilmory commit `c392e065b03977fbe5fe256eb902121f0e4cdb30` (Copyright 2025 Afilmory Team; see LICENSE).

The text, URL, link attributes and Tailwind classes are retained. Integration changes: `clsxm` uses Locusify's existing `cn` helper; the upstream `focusRing` constant is expanded inline. The default MapLibre attribution control is removed. Existing right-side map controls are moved above the copied attribution anchor to prevent overlap. Modified 2026-10-31.
