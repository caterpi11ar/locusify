# v1.4.0

> 2026-03-05

## Features

### Screen Capture Recording
- Replaced canvas-based recording with the browser Screen Capture API (`getDisplayMedia`)
- Recording now captures the actual browser tab, ensuring perfect visual consistency between playback and recorded video
- Eliminated ~900 lines of manual canvas drawing code (intro, photo card, avatar, watermark, transport badge)
- Audio is suppressed and cursor is hidden during recording for a clean output
- Tab switching is prevented during capture via `surfaceSwitching: 'exclude'`

### Recording UI Improvements
- Menu button and replay controls are hidden during active recording for a distraction-free video
- DOM watermark ("Powered by Locusify") is displayed during recording and naturally captured
- Recording automatically stops 2 seconds after replay completes

## Refactor

- Removed `mediabunny` dependency (MP4 via WebCodecs) — no longer needed
- Removed `iconPaths.ts` canvas SVG rendering data — no longer referenced
- Added `recordingActive` state to replay store for centralized recording UI control
