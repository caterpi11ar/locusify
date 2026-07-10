# v1.5.0

> 2026-03-06

## Features

### Map Context Menu — Right-Click & Long-Press
- Right-click (desktop) or long-press (mobile) anywhere on the map to add photos at that specific location
- Photos are placed at the selected coordinates regardless of their EXIF GPS data
- Camera info and date are still extracted from EXIF metadata when available
- Context menu uses the same glass-panel design as other map floating UI elements
- Automatically disabled during replay mode

## Bug Fixes

- Fixed context menu not appearing on the map canvas due to MapLibre's `preventDefault()` conflicting with Radix ContextMenu event handling
- Fixed menu item hover color using incorrect orange accent instead of the project's neutral fill color
- Fixed menu background using undefined shadcn theme tokens instead of the project's glass-panel design system
