# v1.3.1

> 2026-03-05

## Features

### Replay Intro on Every Play
- Logo intro animation and fitBounds now trigger on every play click (resume, restart), matching the initial replay entrance experience
- `ReplayIntroOverlay` refactored to a controlled component with `visible` / `onExitComplete` props for flexible triggering
- `TrajectoryController` re-fits map bounds on every playing transition for consistent zoom behavior

### Floating Photo Card
- New floating photo card with dashed connector line during replay, anchored to the active waypoint
- Responsive offset positioning for mobile and desktop viewports
- Photo card constants extracted to `waypointStyle.ts` for centralized configuration

## Refactor

- `LazyImage` component gains `objectFit` prop for flexible image fitting modes
- `ReplayControls` play button unified under `onPlayClick` callback for all non-playing states
- Video recorder intro drawing updated with improved canvas rendering logic
