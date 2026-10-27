## LOC-26: replay photo carousel

Replaced the PhotoPanel photo display with a controlled PolaroidLineCarousel. The transparent carousel fills the entire left panel, with no background container, paper border, active outline or decorative shadow. The active image is centered at 68% of the panel width; adjacent images peek into the viewport at half opacity. The hanging string spans the panel. MetadataEditor and journal text remain outside carousel event handlers and align with the central photo. Styling uses Tailwind utilities, including clips, dark mode and reduced motion. No CSS Module, custom class selector, dependency, upload or telemetry was added.

The replay store exclusively owns the active index. The photo rail is display-only: no selection callback, navigation buttons, tab stops, dragging, touch navigation or keyboard navigation. Hidden overflow allows programmatic positioning without native horizontal scrolling. Media interaction badges are hidden. MetadataEditor and existing replay controls remain independent. Empty collections render no carousel; single collections remain static; completed playback shows the last photo.

Index changes animate the entering/outgoing photos around the hanging point with a damped 850 ms rotation sequence (0, -7, 4, -2, 0.8, 0 degrees, reversed for backward travel). String-height geometry and resting tilt are separate from the swing. New changes and unmount cancel old animations. Reduced motion disables the swing and smooth scroll, including preference changes while an animation is running.

## Checks

- `pnpm --filter @locusify/app typecheck`: passed.
- `pnpm --filter @locusify/app exec vitest run`: 4 files, 49 existing tests passed.
- ESLint on the two changed components and two locale files: passed.
- `pnpm --filter @locusify/app build`: passed, including TypeScript and localized SEO pages. Vite reports large chunks, including maplibre, as a warning.
- Chrome browser assertions: no controls/tab stops; mouse drag, horizontal wheel, keys and synthetic touch cannot navigate photos; external replay updates still center the active photo; swing keyframes execute and settle; changing reduced-motion preference cancels an active swing; single/empty/completed states; metadata editor remains outside the display.
- locusify-viewport 1.0.0 verifier: 19 checked screenshots and 2 expected negative cases pass. Application captures use fresh contexts for pc-1440, tablet-768-portrait, phone-390-landscape and phone-390-portrait with DPR 1, matching screen/viewport sizes, mobile touch emulation and PNG dimension checks. Evidence includes browser version and actual swing transforms.
- Viewports: 1440×900, 768×1024, 844×390, 390×844. Gallery remains within its panel; the surrounding panel scrolls to retain access to captions/editor. Existing portrait rotate-device overlay is retained.

Browser checks used built-in generated demo images and mocked authentication API responses. They did not use a real account or private photos. Synthetic touch is not a physical iOS/Safari test. Existing LazyMedia handles image/video display; real Live Photo and recording/export need independent QA. Existing React script-tag and Ant Design deprecation console messages were observed outside the changed component.

Screenshots and the browser assertion script are attached to the Multica delivery rather than embedded as runtime-local paths. Independent acceptance remains pending.
