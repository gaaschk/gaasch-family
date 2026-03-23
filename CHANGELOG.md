# Changelog

All notable changes to Heirloom will be documented in this file.

## [0.1.2.0] - 2026-03-23

### Added
- **Pedigree chart view** — left-to-right SVG ancestor chart with ahnentafel layout, configurable 1–6 generations, clickable nodes, and connecting lines
- **Fan chart view** — 240° radial ancestor chart with concentric arc rings, arc-following name labels, and generation-based opacity
- **View switcher tabs** — toggle between Directory, Pedigree, and Fan Chart views via `?view=` URL param; view is shareable
- **PersonSlideOver panel** — single-click any person node opens a slide-over (right panel on desktop, bottom sheet on mobile) with name, dates, birthplace, narrative excerpt, full profile link, and "View as root" action
- **Bloodline highlight** — clicking a node highlights the direct ancestor path to root in forest green; other connectors fade
- **Zoom & pan** — mouse wheel, touch pinch, keyboard `+`/`-`/`0`, and floating `+`/`−`/`↺` controls on both chart views
- **Chart minimap** — thumbnail overview with scroll viewport indicator appears on trees with 4+ generations (desktop only)
- **Person picker** — inline name-search component above the chart, shared by both views; includes loading, empty, and error states
- **Generation controls** — `+`/`−` buttons to adjust visible generations (1–6) without reloading the page
- **Tree switcher** — dropdown in tree header lets users switch between all their trees without going to the dashboard
- **Ancestors API** — `GET /api/trees/[treeId]/ancestors` returns a recursive AncestorNode tree up to 6 generations
- **Descendants API** — `GET /api/trees/[treeId]/descendants` returns a recursive DescNode tree up to 6 generations
- **Custom GEDCOM parser** — tolerant `parseGedcomTolerant` function replaces `parse-gedcom` library; handles non-sequential levels and MyHeritage-exported files
- **`chart-utils.ts`** — shared `formatYear`, `lifespanText`, `flatten`, `AncestorNode`, `DescNode` utilities used by both chart views

### Fixed
- GEDCOM import no longer throws on MyHeritage files with non-sequential structure levels

### Changed
- Ancestor and descendant API generation cap raised from 5 to 6

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
