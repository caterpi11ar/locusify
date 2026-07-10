# v1.5.1

> 2026-03-06

## Features

### Long-Press to Add Photos on Mobile
- Long-press (~500ms) anywhere on the map to open the context menu on touch devices
- Haptic feedback on supported devices when the menu appears
- Panning or dragging cancels the long-press to avoid false triggers
- Guard against double-trigger on Android where long-press also fires the native contextmenu event

## Refactor

- Replaced `document.addEventListener` in MapContextMenu with a React backdrop overlay and `onKeyDown` for idiomatic dismiss handling
- Extracted reusable `useLongPress` hook for touch-based long-press detection
