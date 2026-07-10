# v3.0.1

> 2026-03-08

## Features

### Replay Stats Bar
- Added a dynamic statistics bar at the bottom of trajectory replay showing duration, countries visited, cities visited, and total distance
- Stats update in real-time with spring-animated number transitions as waypoints are reached
- Includes brand logo, product name, and QR code for a polished share-ready layout
- Stats bar remains visible during screen recording for seamless video output

### Globe Orbit Mode
- Added globe orbit mode with starfield canvas background and orbit controller
- New overlay component for globe orbit visualization

### Reverse Geocoding
- Added offline country detection using NaturalEarth boundary data with point-in-polygon
- Added city detection via MapLibre CARTO vector tile queries with 50km proximity threshold

## Bug Fixes

- Removed cursor-hiding hack during screen recording that caused visual glitches
- Fixed fragment mode initial zoom to preserve user's current map center instead of resetting to (0, 20)

## Refactor

- Consolidated "Powered by Locusify" watermark into the replay stats bar, eliminating duplicate branding
- Simplified RegionFillLayer by removing canvas-based photo clipping in favor of highlight fills
- Extracted recording flow into dedicated `useRecordingFlow` hook, separating concerns from overlay components
- Moved replay intro overlay to MapSection level for sharing between trajectory replay and globe orbit
- Removed unused `image-processing.ts` utility module
