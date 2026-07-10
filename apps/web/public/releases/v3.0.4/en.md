# v3.0.4

> 2026-03-10

## Features

### Custom Caption in Text Overlay
- Added a custom caption textarea in the Text tab of the template customizer
- User-typed captions take priority over AI-generated captions during replay

### Music Unavailability Indicator
- Music tracks that fail to load now show a "Coming Soon" badge instead of silently failing
- Unavailable tracks are dimmed and non-clickable, making the state clear to users
- `AudioManager` now exposes `probeTrack()` and `isUnavailable()` for availability checking

### Replay Config Flow
- Controls are shown first; template panel opens on play button click
- Cleaner entry into the replay configuration experience

## Bug Fixes

- Fixed filter, transition, text style, and position labels rendering as raw English strings — they now go through i18n and display correctly in Chinese and other languages
- Fixed `ReplayTextOverlay` never being mounted — text overlays now actually appear on the map during playback
- Fixed responsive globe zoom on mobile — full globe is now visible on iPhone-sized screens
