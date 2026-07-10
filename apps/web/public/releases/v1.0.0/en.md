# v1.0.0

> 2026-02-22

## Features

### Settings
- New settings panel entry (map bottom-right menu → Settings gear icon)
- Bottom drawer slide-out, consistent with the upload photos panel style

### Theme
- Light / Dark / System three-way toggle, default dark
- Map style syncs with theme (Dark Matter for dark / Voyager grey for light)
- Theme preference persisted to localStorage

### i18n
- Manual Chinese / English toggle in settings panel
- Language preference persisted to localStorage

### About
- About page showing app version and GitHub repository link
- Version and repo URL dynamically read from `package.json`

## Bug Fixes
- Fixed replay progress bar panel being transparent in light mode
- Fixed menu shadow overflow with `overflow-hidden` clipping
- Fixed settings panel text color adaptation for light/dark modes
