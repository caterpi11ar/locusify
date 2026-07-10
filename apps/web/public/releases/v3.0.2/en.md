# v3.0.2

> 2026-03-08

## Features

### Custom API Backend
- Migrated authentication from Supabase to a custom API backend with JWT + refresh token flow
- Added email OTP login with 6-digit verification code and cooldown timer
- Added OAuth callback page for Google and GitHub login redirects
- Persistent token storage in localStorage with automatic refresh on 401

### 3-Tier Subscription Plans
- New pricing structure: Free, Pro, and Max plans
- Redesigned pricing drawer with Free banner and Pro/Max side-by-side comparison
- Plan-aware feature gating with typed `Plan` union type

### Backend i18n Error Messages
- API errors now carry localized messages (`en`/`zh`) from the backend
- Redemption code errors display in the user's language automatically

## Bug Fixes

- Fixed login state lost on page refresh — only clear auth on UNAUTHORIZED, not on network errors or 5xx
- Removed redundant profile fetch in `initializeAuth` that doubled API calls on every page load

## Refactor

- Removed `@supabase/supabase-js` dependency and `src/lib/supabase.ts`
- Added `ApiError` class with `getLocalizedMessage()` for i18n error handling
- Removed frontend-maintained redemption error translations (backend-provided now)
- Cleaned up `console.log` in environment validation
