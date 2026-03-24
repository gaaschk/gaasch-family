# Changelog

All notable changes to Heirloom will be documented in this file.

## [0.1.3.0] - 2026-03-24

### Added
- **AI Chat Widget** — floating "Ask AI" button on every tree page opens a chat panel powered by Claude. Tree members can ask free-form questions about their family history; responses stream in real time. Requires tree owner to configure an Anthropic API key in Settings.
- **Lineage Story Modal** — "Tell the story" action traces the ancestor chain between two people (up to 6 generations) and streams a narrative in HTML paragraph form. Exportable as `.txt`, `.md`, `.html`, or PDF (print). Accessible from the person slide-over panel.
- **Chart mouse drag pan** — click-and-drag panning on both Pedigree and Fan Chart views (in addition to existing touch/keyboard pan). Cursor changes to `grab`/`grabbing`; motion is suppressed on mouseup if total drag distance > 5px to prevent accidental node clicks.
- **PersonSlideOver "Tell the story" button** — opens the lineage story modal with the selected person as the starting point and the chart root as the target.

### Fixed
- Chat API: message role injection attack vector closed — only `user` and `assistant` roles forwarded to Anthropic; `system`/`tool` roles silently dropped
- Chat API: API budget drain prevention — message arrays capped at 20 turns and 4,000 chars per message server-side
- Chat API: model string injection closed — `anthropic_model` setting validated against an allowlist; falls back to `claude-haiku-4-5-20251001`
- Chat API: Anthropic error body no longer forwarded to client
- Lineage Story API: same model allowlist and same-person guard (`fromPersonId === toPersonId` → 400)
- ChatWidget: concurrent double-send race fixed via `useRef` guard set synchronously before first `await`
- LineageStoryModal: XSS in `dangerouslySetInnerHTML` — AI-generated HTML stripped to `<p>` tags only, then all `<p>` attributes stripped before render
- ChatWidget: removed unused `treeSlug`/`treeRole` props; restored `outline: revert` on textarea for keyboard accessibility

## [0.1.2.1] - 2026-03-24

### Changed
- **TODOS.md** — TODO-4 (batch ancestor/descendant queries) promoted from deferred to P1 active; pulled into scope alongside EU citizenship feature as the forcing function (6 generations = 60+ sequential queries before eligibility logic runs)
- **USER_REQUIREMENTS.md** — plan review report updated; CEO, Design, and Eng reviews all CLEARED; credits/lineage/EU eligibility architecture locked in
- **gstack vendored copy** — upgraded from v0.11.5.2 to v0.11.15.0; brings zsh-compatible globbing, CSO skill, outside voice plan review, improved adversarial review scaling, design hard rules, and AI slop detection

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
