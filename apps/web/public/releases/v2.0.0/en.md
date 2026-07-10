# v2.0.0

> 2026-03-06

## Features

### Pro Subscription & Pricing
- Stripe-powered subscription system with monthly and yearly Pro plans
- New pricing drawer with billing cycle toggle and plan comparison
- Stripe Customer Portal integration for managing existing subscriptions
- Redemption code system for gifting Pro access with configurable duration and usage limits
- Admin edge function for batch-generating redemption codes

### AI-Powered Features (Pro)
- AI template recommendation — analyzes trip metadata to suggest the best replay template
- AI caption generation — creates short, evocative captions for each waypoint
- Usage tracking for AI features with per-user rate limiting

### Replay Templates & Customization
- Template system with five built-in styles: Minimal, Vlog, Cinematic, Travel Diary, Night Mode
- Template selector UI with live preview during configuration phase
- Full customization options: filters, transitions, music, intro style, text overlays
- CSS filter engine with intensity control (vintage, warm, cool, B&W, film, cinematic)
- Transition engine supporting fade, slide, zoom, and flip effects
- Stats card overlay showing trip distance, duration, and photo count
- Text overlay with customizable captions per waypoint

### Supabase Backend
- Complete database schema: profiles, subscriptions, subscription providers, redemption codes, redemptions, usage tracking
- Row-level security policies for all tables
- Stripe webhook handler for subscription lifecycle events
- Seven edge functions: checkout, portal, webhook, redeem-code, AI captions, AI recommend, admin code generation

## Bug Fixes

- Fixed `usage_tracking` INSERT silently failing due to missing RLS INSERT policy
- Fixed render-phase side effect in `ReplayIntroOverlay` when `introStyle` is `'none'`
- Fixed `AudioManager.pause()` / `fadeOutAndStop()` race condition where a new `play()` call could be killed by a stale timeout
- Fixed redemption code double-redemption via non-atomic increment — now uses a Postgres RPC with row-level locking
- Fixed `VITE_DEBUG_PRO` having no production guard — now gated behind `import.meta.env.DEV`
- Fixed Stripe webhook HMAC verification using timing-vulnerable `===` — replaced with `crypto.subtle.timingSafeEqual()`
- Fixed `loadTrack()` not awaited in `confirmConfig()` causing silent audio failure
- Added `UNIQUE` constraint on `subscriptions.user_id` to prevent duplicate rows
- Restricted CORS to allowed origins instead of wildcard `*` across all edge functions
- Fixed `subscription.ts` bypassing validated `env` object by reading `import.meta.env` directly
- Added `.catch()` to fire-and-forget `fetchProfileAndSubscription` calls to prevent unhandled rejections
- Fixed CSS filter intensity ignoring `hue-rotate(Xdeg)` values due to incomplete regex
- Added Stripe `priceId` validation against configured price IDs in checkout function
- Added user-facing error toast when Stripe price IDs are unconfigured
- Fixed Stripe portal URL being cached indefinitely — now always fetches a fresh session
- Added OpenAI response validation before parsing in both AI edge functions
- Fixed `AudioManager.dispose()` not clearing singleton instance
- Fixed auto-stop timeout in `useVideoRecorder` never being cleared on cleanup
- Fixed Enter key in redeem code input bypassing the loading guard
- Replaced fragile `plan.startsWith('pro')` with explicit plan list matching
- Added input validation for `duration_days`, `max_uses`, and `plan` in admin code generation
