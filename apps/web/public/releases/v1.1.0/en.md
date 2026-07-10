# v1.1.0

> 2026-02-27

## Features

### Gallery Drawer
- New photo management panel (Gallery Drawer) for browsing and managing uploaded photos
- Deep integration with the map page — click to locate the corresponding photo position

### Privacy Settings
- New privacy section in the settings panel
- Localized display of data collection and privacy policies in Chinese and English

### SEO
- Comprehensive site SEO optimization (meta tags, structured data, etc.)
- Added llms.txt, updated robots.txt and sitemap.xml
- Optimized content visibility for AI search engines

### Documentation
- Rewrote Chinese and English README with full product introduction
- Added QR code entry for mobile experience

## Refactor

- Extracted shared formatting utilities to `lib/formatters.ts`, eliminating duplicate logic
- Unified GPS type naming to `GPSCoordinates`
- Extracted `SettingOptionGroup` shared component, reducing settings panel duplication
- Extracted `glassPanel` style constant to `utils.ts`
