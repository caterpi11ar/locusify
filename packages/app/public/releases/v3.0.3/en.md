# v3.0.3

> 2026-03-09

## Features

### Forgot / Reset Password
- Added forgot password flow: enter email to receive a reset link via Supabase
- Added standalone reset password page that parses Supabase hash fragment tokens
- Added password reset button for logged-in users in account drawer with 60s cooldown
- Password complexity validation: 8+ characters with uppercase, lowercase, and numbers

### Password Login
- Added password-based login and signup alongside existing OTP flow
- Login method tabs (Verification Code / Password) in the login drawer
- Forgot password view integrated within the password login form

### Privacy Consent
- Added privacy policy and terms of service checkbox to login drawer
- All submit actions guard against unconsented state with toast notification

## Bug Fixes

- Fixed invisible error text by replacing undefined `text-destructive` with `text-red`
- Fixed signup password mismatch showing field label instead of error message
- Fixed confirm password input not clearing error state on change
- Fixed auth callback white screen with parallel requests and loading state

## Refactor

- Extracted shared `useCooldown` hook for 60-second rate limiting across 3 components
- Added `Checkbox` UI component (Radix-based)
