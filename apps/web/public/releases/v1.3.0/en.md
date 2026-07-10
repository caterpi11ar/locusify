# v1.3.0

> 2026-03-04

## Features

### Replay Configuring Phase
- New configuring step before replay playback — browse the map freely before starting
- Per-segment transport mode selection (walking, cycling, driving, bus, train, flight, boat)
- Transport mode badge displayed on the moving avatar during playback

### Avatar System
- Choose between profile photo, preset character avatars, or default dot for the replay marker
- New avatar settings page with preset selection (cat, dog, bird, rabbit, bear, fox, penguin, panda)
- Avatar and transport mode badge rendered on video recording canvas

### Video Recording Enhancements
- Avatar and transport mode icons now appear in exported video recordings
- Shared style constants ensure visual consistency between DOM and Canvas rendering

## Bug Fixes

- Fixed premature camera zoom when selecting transport mode during replay configuration
- Fixed avatar occasionally disappearing during playback by removing scale-from-zero mount animation
- Removed forced zoom level on playback start to preserve user's current map view

## Refactor

- Extracted shared constants to dedicated data modules (`waypointStyle`, `iconPaths`, `presetAvatars`, `transportModes`)
- Added `haversine` distance utility for segment distance calculation
- Added `replay.ts` type definitions for segment metadata and transport modes
