# v1.2.0

> 2026-03-03

## Refactor

### OAuth Login Migration to Supabase Auth
- Migrated Google and GitHub OAuth from custom frontend implementations to Supabase Auth
- Google login no longer loads Identity Services SDK or parses JWTs client-side
- GitHub login no longer requires a Cloudflare Worker proxy for token exchange
- Session management (persistence, refresh) is now handled automatically by Supabase SDK
- Simplified environment variables from 3 OAuth-specific keys to 2 Supabase keys
- Auth state is now driven by `onAuthStateChange` listener instead of manual store updates
