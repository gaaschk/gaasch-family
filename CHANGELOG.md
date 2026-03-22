# Changelog

All notable changes to Heirloom will be documented in this file.

## [0.1.1.0] - 2026-03-22

### Fixed
- Tree owners can now open their own trees — previously, clicking "Open tree" or "Admin" on the dashboard silently redirected back because the access check didn't recognize the owner
- New trees now include the owner as an admin member, fixing the "0 members" display on the dashboard

### Changed
- USER_REQUIREMENTS.md updated to reflect open self-service signup (removed stale admin-approval language)
- PM2 ecosystem config comment corrected — documents the reliable env-loading pattern for manual restarts
- Server setup script now lists EMAIL_SERVER and EMAIL_FROM as required env vars
- `.env.local.example` includes SendGrid SMTP format as a commented production example

## [0.1.0.1] - 2026-03-22

### Changed
- Landing page CTAs reordered: "Create your tree" (primary) + "Sign in" (secondary)
- Landing tagline updated to "Preserve your family's story. Free to start."
- Login page signup link text changed to "New here? Create a free account"
- Signup flow language updated from "Request access" to open self-service signup
- Success banner shown on login page after signup redirect (`?from=signup`)
- Success banner uses semantic `<output>` element for accessibility
