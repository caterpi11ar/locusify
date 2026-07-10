# v3.0.6

> 2026-03-11

## Features

### Android Release Pipeline
- Gradle auto-reads version from `package.json` — single source of truth, no manual sync needed
- Added `build:android` script for one-command signed APK builds
- New GitHub Actions workflow: push a `v*` tag to automatically build and publish signed APK to GitHub Releases
- Enabled R8 code shrinking and resource optimization for smaller APK size
- Added Capacitor-specific ProGuard keep rules

### App Icon
- Replaced default Android robot icons with Locusify brand logo across all density buckets
- Proper adaptive icon foreground with safe-zone padding

## Bug Fixes

- Upgraded AGP to 8.9.1 and compileSdk to 36 for `androidx.browser` compatibility
