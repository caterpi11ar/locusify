# v3.0.0

> 2026-03-08

## Features

### Fragment Mode
- Brand-new Fragment Mode that fills country shapes on a world map with your travel photos
- Tap the globe button on the map controls to toggle between normal and fragment view
- Automatic GPS-to-country matching maps each photo to its corresponding region
- GeoJSON-based country boundaries powered by Natural Earth 110m data

### Onboarding Guide — Step 3
- Added a third onboarding step that spotlights the Fragment Mode globe button
- Violet pulse ring highlights the button with a clear explanation of the feature
- Bilingual guide text in English and Chinese

## Bug Fixes

- Geolocate button no longer zooms to street level (zoom 14) in Fragment Mode; now flies to country-level view (zoom 3)
- Fragment Mode enforces a maximum zoom of 5, preventing deep zoom via scroll, double-click, or zoom buttons
