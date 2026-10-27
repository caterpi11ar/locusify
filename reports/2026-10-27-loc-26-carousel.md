## LOC-26: replay photo carousel

Replaced the PhotoPanel photo display with a controlled PolaroidLineCarousel. The transparent carousel fills the entire left panel, with no background container, paper border, active outline or decorative shadow. The active image is centered at 68% of the panel width; adjacent images peek into the viewport at half opacity. The hanging string spans the panel. MetadataEditor and journal text remain outside carousel event handlers and align with the central photo. Styling uses Tailwind utilities, including clips, dark mode and reduced motion. No CSS Module, custom class selector, dependency, upload or telemetry was added.

The replay store owns the active index. External changes scroll the selected card into view; arrows, keyboard and completed mouse/touch drags call the existing seekToWaypoint interface. Scroll events only position the clips on the string and never seek replay. Empty collections render no carousel; single collections disable both arrows. The existing seek-to-last/completed behavior is retained.

## Checks

- `pnpm --filter @locusify/app typecheck`: passed.
- `pnpm --filter @locusify/app exec vitest run`: 4 files, 49 existing tests passed.
- ESLint on the two changed components and two locale files: passed.
- `pnpm --filter @locusify/app build`: passed, including TypeScript and localized SEO pages. Vite reports large chunks, including maplibre, as a warning.
- Chrome browser interaction assertions: previous/next boundaries; timeline-to-photo synchronization; only one index change during smooth navigation; Home/End and completed last item; mouse drag; CDP touch swipe; metadata editing and ArrowRight isolation; external replay index updates; reduced-motion transforms and disabled transitions; single and empty collections.
- Visual layout assertions: transparent gallery and photo wrappers, no frame shadow/padding, full left-panel width, centered active image and simultaneously visible portions of both adjacent images for a middle selection.
- Viewports: 1440×900, 768×1024, 844×390, 390×844. Gallery remains within its panel. Short landscape view keeps carousel arrows visible; the surrounding panel scrolls to retain access to captions/editor. Existing portrait rotate-device overlay is retained.

Browser checks used built-in generated demo images and mocked authentication API responses. They did not use a real account or private photos. Synthetic touch is not a physical iOS/Safari test. Existing LazyMedia handles image/video display; real Live Photo and recording/export need independent QA. Existing React script-tag and Ant Design deprecation console messages were observed outside the changed component.

Screenshots and the browser assertion script are attached to the Multica delivery rather than embedded as runtime-local paths. Independent acceptance remains pending.
