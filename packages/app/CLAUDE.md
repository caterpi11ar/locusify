# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Locusify codebase.

## Project Overview

**Locusify** is an intelligent travel tool—upload raw photos, get auto visual route maps and seamless, essence-capturing vlogs.

### Technical Architecture

**Tech Stack:**

- React 19 - Latest React version with Compiler
- TypeScript - Complete type safety
- Vite 7 - Modern build tool
- Tailwind CSS 4 - Atomic CSS framework
- Radix UI - Accessible component library
- Zustand - State management
- TanStack Query - Data fetching and caching
- React Router 7 - Routing management
- i18next - Internationalization
- MapLibre GL - Map rendering
- Motion - Animation library

**Project Structure:**

```
Locusify/
├── .claude/                  # Claude Code configuration
├── .husky/                  # Git hooks
├── public/                  # Static assets
├── src/                     # Source code
│   ├── assets/             # Asset files
│   ├── components/         # UI components
│   │   ├── auth/          # Authentication components
│   │   ├── ui/            # Base UI components (shadcn/ui)
│   │   └── upload/        # Upload-related components
│   ├── contexts/           # React Context providers
│   ├── data/               # Static data
│   ├── hooks/              # Custom React hooks
│   ├── layout/             # Layout components
│   ├── lib/                # Utility libraries
│   ├── locales/            # i18n translations
│   ├── pages/              # Page components
│   │   ├── auth/          # Auth callback & password reset
│   │   ├── error/         # Error pages
│   │   ├── explore/       # Explore page
│   │   ├── map/           # Map page + trajectory replay
│   │   ├── pricing/       # Pricing drawer
│   │   ├── settings/      # Settings page
│   │   └── splashScreen/  # Splash screen
│   ├── routers/            # Route definitions
│   ├── stores/             # Zustand state stores
│   └── types/              # TypeScript type definitions
└── test/                    # Test files
```

## Development Standards

### Package Management

**pnpm Commands:**
```bash
pnpm install            # Install all dependencies
pnpm dev                # Start Vite development server
pnpm build              # Build for production (tsc + vite build)
pnpm preview            # Preview production build
pnpm lint               # Run ESLint with auto-fix
pnpm typecheck          # Run TypeScript type checking
pnpm test               # Run Vitest unit tests
pnpm e2e                # Run E2E (see e2e/README.md)
```

### E2E Testing

E2E lives in `e2e/` and is driven by the `webapp-testing` skill
(`.agents/skills/webapp-testing`, Playwright + Python). See `e2e/README.md` for the full guide.

Before writing or debugging any E2E script, know these six traps:

1. **Never call `wait_for_load_state('networkidle')`** — MapLibre streams tiles from
   `tiles.basemaps.cartocdn.com` and `/_vercel/speed-insights/script.js` 404-retries forever,
   so it always times out. Wait for explicit elements instead.
2. **A mounted `canvas` does not mean the map painted.** Vector tiles are fetched *and drawn*
   asynchronously; screenshotting too early yields a flat, empty map while every assertion
   still passes. Wait until `.mvt` responses stop growing.
3. **`#react-scan-root` swallows all clicks in dev** — every `Locator.click()` fails with
   `intercepts pointer events`. Neutralize it: `#react-scan-root{pointer-events:none!important}`.
4. **Auth gate needs seeding plus an API mock** — `initializeAuth()` calls `clearUser()`
   when there is no token, so `/auth/me` must be mocked or the user is dropped.
5. **Never hand-write `localStorage` in a test.** Seed state through `window.__locusify`
   (dev-only, `src/lib/dev/testBridge.ts`). Writing the `{state, version}` envelope by hand
   duplicates the persist serialization format; the test then fails silently whenever a store
   changes its `name` / `version` / `partialize` / `migrate`.
6. **Scope `page.route` to `/api/v1/`** — a `**/api/**` glob also captures `src/lib/api/*.ts`
   and breaks module loading.

Use the `data-testid` hooks (`map-menu-upload`, `photo-file-input`, `route-create`, …) rather than
button text; drawer labels contain a non-breaking space (U+00A0) that breaks `has_text`, and
`title` attributes are translated.

### Client State Persistence

**All persisted client state goes through the zustand `persist` middleware.** Never call
`localStorage.setItem` directly in application code.

| store | key | contents |
|---|---|---|
| `tokenStore` (`lib/auth/token-storage.ts`) | `locusify-tokens` | access / refresh token |
| `authStore` | `locusify-auth` | user |
| `settingsStore` | `locusify-settings` | theme / language / avatar source |
| `uiStore` | `locusify-ui` | announcement version seen / help seen / feedback throttle |

`tokenStore` is deliberately a leaf module with no business imports: `lib/api/client.ts` reads
it for token refresh, while `authStore` imports `client.ts` — folding tokens into `authStore`
would create a cycle.

When you add a store whose state used to live under a raw key, or change a store's persisted
shape, ship a migration (see `uiStore.adoptLegacyState` and `legacyAwareStorage` in
`token-storage.ts`). Dropping old data silently logs every user out or re-shows dialogs they
already dismissed; `[7]` in the E2E suite guards this.

### Language Routing

`/en/` and `/zh-CN/` are real routes and the **URL is the single source of truth** for language —
the route loader in `routers/index.tsx` calls `i18n.changeLanguage()`. A persisted user preference
in `locusify-settings` must never override it (doing so makes both routes meaningless for
first-time visitors, who are exactly the SEO/share-link audience).

### Code Quality Standards

#### During Development
- Follow TypeScript strict mode with proper type definitions
- Use Tailwind CSS 4 for consistent, responsive design patterns
- Use Radix UI for consistent UI components
- Implement Zustand stores for state management
- Use TanStack Query for data fetching and caching
- Add comprehensive error handling with proper TypeScript types
- Use i18next for internationalization support
- Write unit tests for core logic and components

#### Commit Standards
Project uses commitlint with conventional commits format:
```bash
feat: add new feature
fix: bug fix
chore: maintenance tasks
docs: documentation updates
```
