## Fractional viewport regression

`useIsMobile` must be the complement of Tailwind's `sm` media query (40rem,
640 CSS px at the default browser font size). Subtracting one pixel leaves
fractional widths between 639 and 640 outside both layouts.

Run the app with `pnpm --filter @locusify/app dev --host 127.0.0.1 --port 1161`.
From the repository root, create `output/playwright`, open a fresh local Chrome
session with `npx --yes --package @playwright/cli playwright-cli -s=loc31 open
http://127.0.0.1:1161 --headed`, then use the CLI's `run-code --filename` with:

1. `docs/verification/loc-31/setup.playwright.js` (synthetic local UI identity;
   does not test authentication or send credentials).
2. Take a snapshot. Close the login drawer if present, then open 使用帮助.
3. `docs/verification/loc-31/layout.playwright.js`.
4. `docs/verification/loc-31/keyboard.playwright.js` (Chinese UI).

The layout script asserts the real prompt's position, width, single animation,
48/22px icon sizes and absence of horizontal overflow. It records actual CSS
width, DPR, visual viewport scale, CSS zoom and both legacy boundary queries;
requested viewport width alone is not evidence of the rendered CSS width.
It checks both themes and repeated boundary crossings, and throws on failure.
Screenshots and measurement JSON are written to `output/playwright`.

On Windows Chrome, requested 639px produced 639.333374 CSS px. Before the fix,
both legacy queries were false and the card began at 431.96, below the buttons'
411.96 bottom. After the fix, the card spans the 582px content width, ends at
575.46 and precedes the buttons at 591.46. All 22 layout samples pass; desktop
640/1280px alignment and 320/390px layout remain intact.

Shared consumers: FirstJourneyPrompt, MapSection, LoginDrawer, LegalDrawer,
SelectPhotosDrawer, GalleryDrawer, SettingsDrawer, PricingDrawer, LivePhotoBadge.
An additional local component harness checked all six drawers' placement/masks
and the Live Photo hint at the fractional boundary and on return from desktop.
MapSection integration was checked through actual upload keyboard activation:
mobile bottom drawer with mask, desktop 480px left drawer without mask.
The component harness and its measurement JSON accompany the issue evidence.

Scope: local Chrome, synthetic login state, component themes, height 844px.
No actual photo, GPS, route or video input is used. These checks do not establish
production deployment, real authentication, recording, touch hardware behavior,
or complete functional coverage of every drawer.
