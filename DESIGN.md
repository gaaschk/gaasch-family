# Design System — Heirloom

## Product Context
- **What this is:** A private multi-tenant family history platform — build, explore, and share your genealogy tree, enriched by AI-generated biographies and external record matching.
- **Who it's for:** Families researching ancestry; people pursuing EU citizenship by descent; anyone with a GEDCOM file who wants a beautiful, private place to explore their heritage.
- **Space/industry:** Genealogy software. Peers: Ancestry, FamilySearch, MyHeritage, Geni — all of which feel like generic software products, not archives.
- **Project type:** Data-rich web application with editorial content (biographies, lineage stories).

## Aesthetic Direction
- **Direction:** Luxury/Refined + Organic warmth — a cultural artifact, not a tech product.
- **Decoration level:** Intentional — subtle paper grain or texture on key surfaces (auth pages, backgrounds), but restrained. Warmth comes from color and typography, not ornament.
- **Mood:** Opening a beautifully kept family archive — the warmth of aged paper, the precision of a well-typeset book. Purposeful and unhurried. The opposite of a dashboard.
- **Design posture:** Every screen asks "what does the user need to feel and know *right now*?" Not "what can we show them?"

## Color System

### Approach
Balanced warm palette anchored in parchment cream. Forest green as the primary interaction color — unexpected in genealogy (where everything is corporate blue or beige), deeply thematic (a family *tree*), and immediately distinctive.

### Light Mode
| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Background | `--parchment` | `#FAF5EC` | Page backgrounds |
| Surface | `--parchment-2` | `#F2EBE0` | Cards, sidebar, panels |
| Surface deep | `--parchment-3` | `#E8DDD0` | Hover states, inset areas |
| Text primary | `--brown-text` | `#2C1A0E` | All primary text |
| Text secondary | `--brown-2` | `#4A3020` | Subheadings, emphasis |
| Text muted | `--brown-muted` | `#7A6653` | Labels, metadata, captions |
| Border | `--border` | `#C4B09A` | Component borders |
| Border light | `--border-light` | `#DDD0BE` | Dividers, subtle separators |
| Accent primary | `--amber` | `#C9974A` | Highlights, badges, pull-quote borders |
| Accent light | `--amber-light` | `#E6BC7A` | Amber on dark surfaces |
| Accent bg | `--amber-bg` | `#FDF3E4` | Badge/alert backgrounds |
| Action primary | `--forest` | `#2D4A35` | Buttons, links, active nav, sidebar bg |
| Action hover | `--forest-2` | `#3D5E48` | Button hover, focused states |
| Action light | `--forest-light` | `#6B9A7A` | Decorative, illustrations |
| Action bg | `--forest-bg` | `#EAF0EC` | Success states, focus rings |

### Dark Mode
| Role | Hex | Notes |
|------|-----|-------|
| Background | `#1A1208` | Very dark warm brown (not black) |
| Surface | `#241A0E` | Card surfaces |
| Surface deep | `#2F2216` | Inset/hover |
| Text primary | `#F5EDD8` | Warm cream |
| Text muted | `#9A8C7A` | |
| Border | `#4A3828` | |
| Amber | `#D4A85C` | Slightly lighter for dark bg |
| Forest | `#4A7558` | Lighter for dark bg contrast |

### Semantic Colors
| State | Light | Dark |
|-------|-------|------|
| Success | `#2D4A35` / bg `#EAF0EC` | `#4A7558` / bg `#0E1A10` |
| Warning | `#7A5500` / bg `#FDF3E4` | `#D4A85C` / bg `#1E1400` |
| Error | `#8B2020` / bg `#FEF0F0` | `#E88080` / bg `#2A0808` |
| Info | `#7A6653` / bg `#F2EBE0` | `#9A8C7A` / bg `#241A0E` |

### Color Rules
- Forest green is the ONLY interactive color (buttons, links, active states, focus rings). Amber is decorative/badge only — never on clickable elements as the primary affordance.
- Never use pure black (`#000`) or pure white (`#FFF`). Everything is warm.
- Dark mode: reduce saturation of all colors by ~15%, keep warmth.

## Typography

### Typefaces

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Display / person names / hero headings | **Fraunces** | 300–600 | Optical variable 9–144pt; italic variant for emphasis; feels like a printed book |
| Narrative body / biographies / long text | **Source Serif 4** | 300–400 | Optical variable 8–60pt; italic for pull quotes; 65ch max reading width |
| UI chrome / labels / buttons / nav | **Instrument Sans** | 400–600 | Clean, warm sans; never use above 600 weight |
| Data / dates / places / tables / IDs | **Geist Mono** | 400–500 | Tabular-nums always enabled for date/number columns |
| Code | **Geist Mono** | 400 | Same font, different context |

### Loading
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;1,8..60,300;1,8..60,400&family=Instrument+Sans:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale
| Level | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| `display-xl` | Fraunces | 72–96px | 400 | 1.0 | Hero headings |
| `display-lg` | Fraunces | 48px | 400 | 1.1 | Page titles, person names |
| `display-md` | Fraunces | 36px | 400 | 1.15 | Section headings |
| `display-sm` | Fraunces | 24px | 400 | 1.2 | Card headings, sub-sections |
| `narrative` | Source Serif 4 | 16–17px | 400 | 1.8 | Biography text |
| `narrative-lg` | Source Serif 4 | 18–20px | 300 italic | 1.5 | Pull quotes, lead paragraphs |
| `body` | Instrument Sans | 15px | 400 | 1.6 | UI text, descriptions |
| `body-sm` | Instrument Sans | 13px | 400 | 1.5 | Secondary text, metadata |
| `label` | Instrument Sans | 11–12px | 600 | 1.4 | ALL-CAPS labels (letter-spacing: 0.12–0.16em) |
| `data` | Geist Mono | 12–14px | 400 | 1.4 | Dates, IDs, numeric data |
| `data-sm` | Geist Mono | 11px | 400 | 1.4 | Compact tables |

### Typography Rules
- Person names always in Fraunces. No exceptions.
- Dates and places always in Geist Mono with `font-variant-numeric: tabular-nums`.
- Biography/narrative text always in Source Serif 4 at ≥16px with max-width 62–65ch.
- UI labels in ALL CAPS use Instrument Sans 10–11px with letter-spacing 0.12–0.16em.
- Italic Fraunces for name emphasis (middle names, maiden names). Never bold italic.

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable — this is a reading and research app, not a dashboard. Space lets content breathe.
- **Scale:** `2` `4` `8` `12` `16` `20` `24` `32` `40` `48` `64` `80` `96` `128`

```css
--space-1:  4px;   /* Tight internal padding */
--space-2:  8px;   /* Default gap */
--space-3:  12px;  /* List item padding */
--space-4:  16px;  /* Component padding */
--space-5:  20px;  /* Section sub-gaps */
--space-6:  24px;  /* Card padding */
--space-8:  32px;  /* Page section padding */
--space-10: 40px;  /* Large section gaps */
--space-12: 48px;  /* Page top padding */
--space-16: 64px;  /* Major section breaks */
--space-20: 80px;  /* Page-level top/bottom */
```

## Layout

- **Approach:** Hybrid — persistent left sidebar for navigation, editorial center for person pages, disciplined grid for admin/data sections
- **Grid:** 12-column; most content uses 8–10 col (with 1–2 col offset)
- **Max content width:** 1200px (app shell); 800px (person page narrative); 65ch (biography text)
- **Sidebar width:** 220px (desktop); hidden on mobile (slide-in drawer)

### Border Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Badges, small chips |
| `--radius-md` | 6px | Buttons, inputs |
| `--radius-lg` | 10px | Cards, panels |
| `--radius-xl` | 16px | App shell, heritage card, dialogs |
| `--radius-full` | 9999px | Avatars, pills |

### Breakpoints
| Name | Width | Notes |
|------|-------|-------|
| `sm` | 640px | Single column |
| `md` | 768px | Sidebar becomes drawer |
| `lg` | 1024px | Full sidebar + content |
| `xl` | 1280px | Wider content area |

## Motion

- **Approach:** Minimal-functional with intentional moments — transitions aid comprehension; no decoration for its own sake.
- **Easing:** enter `ease-out`; exit `ease-in`; move `ease-in-out`
- **Durations:**
  - `micro`: 50–100ms — hover states, focus rings
  - `short`: 150–200ms — button press, badge appear
  - `medium`: 250–350ms — panel open/close, page transitions
  - `long`: 400–600ms — complex entry animations (heritage card, today card)

### Key Animations
- **Tree navigation:** Fade + subtle slide (150ms) when moving between people
- **Chat panel:** Slide in from right (250ms ease-out)
- **Person card select:** Fade-in of detail panel (200ms)
- **Today in History card:** No animation — always present, discovered naturally
- **Heritage card reveal:** Gentle cascade of lineage items (staggered 80ms each)
- **No bounce, spring, or elastic easing anywhere** — the product is dignified, not playful

## Color & Theme

### Theme Mode
The app supports three modes: **light**, **dark**, and **system** (follows OS preference).
- Implemented via CSS custom properties on `:root` / `[data-theme="dark"]`
- User preference stored in `localStorage` and applied before first paint (no flash)
- Toggle available in user settings and as an accessible keyboard shortcut

## Key Screen Patterns

### Persistent Sidebar (desktop)
- Always visible at ≥768px. Never collapses to a hamburger on desktop.
- Background: `--forest` (`#2D4A35`)
- Text: warm cream (`#FAF5EC`) with 70% opacity for non-active items
- Active item: 12% white overlay + full opacity text + 500 weight
- Logo: Fraunces italic, amber accent on the wordmark
- Search: ghost input at 8% white with 10% white border
- Chat button: amber ghost at the bottom — always visible

### Person Page Layout
```
┌─────────────────────────────────────┐
│  Avatar  Name (Fraunces 36px)        │
│          Dates (Geist Mono)          │
│          Badges row                  │
├─────────────────────┬───────────────┤
│  Biography          │  Sidebar data  │
│  (Source Serif 4,   │  (Vital recs,  │
│   65ch max)         │   Family,      │
│                     │   Hints)       │
│  Pull quotes in     │  All labels in │
│  amber border       │  Geist Mono    │
└─────────────────────┴───────────────┘
```

### Chat Panel (AI Family Historian)
- **Desktop and mobile:** Bottom sheet — rises from the bottom of the screen, covers ~60% of viewport height
- Opening: slides up with `ease-out` 250ms; backdrop darkens slightly (`rgba(44,26,14,0.3)`)
- Width: full viewport width (no left/right gutters on desktop — feels conversational, not sidebar-like)
- Handle bar at top for drag-to-dismiss (mobile); close button top-right (both)
- Max-height: 60vh; overflows to scrollable message list
- Input: pinned at bottom of sheet; Instrument Sans 15px; Enter to send; Shift+Enter for newline
- Message bubbles: user = right-aligned, parchment-3 bg; assistant = left-aligned, no bubble (just text, Source Serif 4)
- Tool status lines: Source Serif 4 italic, `--brown-muted`, indented slightly
- Clickable person links in responses: `--forest`, underlined on hover, clicking closes chat + navigates to person
- Persistent across page navigation — conversation history survives as long as the session

### Person Avatars
- Default: circle with initials in Fraunces 500, `--parchment-3` background, `--border` ring
- **Portrait photo:** If a Document Vault image is tagged as `portrait` (or the user confirms an AI recommendation), it replaces the initials as the avatar
- **AI portrait recommendation:** When a photo is uploaded to a person's documents, the system uses AI to check if it looks like a headshot/portrait and suggests: "This photo looks like a good portrait — set as avatar?" — one-tap confirmation
- Avatar sizes: 72px (person page header), 40px (tree explorer node), 28px (family strip chips), 20px (inline mentions)
- All sizes use the same image, CSS `object-fit: cover` cropped to circle

### Data Fields
- Field labels: Instrument Sans 11px, 600 weight, ALL CAPS, letter-spacing 0.12em, `--brown-muted`
- Dates: Geist Mono, tabular-nums
- Place names: Source Serif 4, 13px (slightly warmer than monospace)
- IDs (FamilySearch, GEDCOM): Geist Mono, muted color

### Heritage Card
- Background: `--forest` gradient
- Lineage items: amber dots connected by a faint vertical line
- Generation numbers: Geist Mono, very low opacity
- Names: Fraunces 16px
- Years: Geist Mono, 40% opacity
- Place: Source Serif 4 italic, 45% opacity
- Shareable at `/trees/[slug]/people/[id]/heritage-card.png` (Satori server-side render)

**Line selection UI (shown before generating):**
Three-button toggle: `Paternal Line` | `Maternal Line` | `Custom Path`
- Paternal/Maternal: immediately traces the line and shows a preview
- Custom: shows an interactive ancestor picker — click each generation slot to select a person (defaults to the auto-traced path, user can override any slot)
- Preview renders inline before user confirms and gets the shareable URL
- Max depth: system suggests up to 7 generations; user can trim

### "This Day in Family History" Card
- Forest green gradient background
- Eyebrow: Instrument Sans, amber-light, ALL CAPS
- Name: Fraunces 32px, cream text
- Sub: Source Serif 4 italic, 65% opacity cream
- Years: Geist Mono, 50% opacity
- Appears at top of dashboard; dismissible per session

### Geographic Ancestor Map
```
┌────────────────────────────────────────────────┐
│  HEADING: "Where They Lived" (Fraunces 28px)    │
│  Sub: "N ancestors across N countries"          │
├──────────────────────────────┬─────────────────┤
│  Interactive map             │  People list     │
│  (Mapbox / Leaflet)          │  (scrollable,    │
│  • Points in --amber         │   filtered by    │
│  • Hover → person card       │   map viewport)  │
│  • Cluster at high zoom-out  │  Each item:      │
│  • Country boundaries faint  │   Name (Fraunces)│
│    in --border-light         │   Place (S.Serif)│
│                              │   Date (G.Mono)  │
└──────────────────────────────┴─────────────────┘
```
- Map tile style: warm sepia/parchment (Mapbox style or custom Leaflet tiles)
- Ungeocoded people shown in list with "location unknown" badge; link to edit
- Mobile: map full-width, list below (collapsible)
- Empty state: "No locations yet — generate biographies or add birth places to your people." + CTA to people list

### Family Statistics Dashboard
```
┌───────────────────────────────────────────────┐
│  HEADING: "By the Numbers" (Fraunces 28px)     │
│  Sub: "N people, N families, N generations"    │
├──────────────┬──────────────┬──────────────────┤
│  STAT CARD   │  STAT CARD   │  STAT CARD       │
│  Oldest      │  Youngest    │  Most common name│
│  (Fraunces   │  (Fraunces   │  (Fraunces 36px) │
│   48px num)  │   48px num)  │                  │
├──────────────┴──────────────┴──────────────────┤
│  BIRTH YEAR DISTRIBUTION (bar chart)           │
│  Bars in --amber, axis labels Geist Mono       │
├────────────────────────────────────────────────┤
│  COUNTRIES (horizontal bar chart)              │
│  Top 10 birth countries, bars in --forest      │
├──────────────────────────┬─────────────────────┤
│  MOST COMMON FIRST NAMES │  LIFESPAN BY ERA    │
│  (ranked list, Fraunces) │  (line chart, amber)│
└──────────────────────────┴─────────────────────┘
```
- Stat cards: large Fraunces number, Instrument Sans label below
- Charts: warm palette only (amber/forest/brown-muted); no generic blue/red chart colors
- Empty state: "Add people to your tree to see statistics." — only shows after ≥10 people
- Mobile: single-column, charts full-width

### Agent Research Inbox
```
┌───────────────────────────────────────────────────┐
│  HEADING: "Research Inbox" (Fraunces 28px)         │
│  Sub: "N actions awaiting your review"            │
├────────────────────────┬──────────────────────────┤
│  TASK LIST (left)      │  TASK DETAIL (right)     │
│  Each task:            │  Person name (Fraunces)  │
│  • Person avatar + name│  Proposed changes list   │
│  • Task type badge     │  Field-by-field diff:    │
│  • Source badge (FS/   │    Current → Proposed    │
│    WikiTree/Geni)      │  Checkboxes to select    │
│  • Time queued         │  which fields to accept  │
│  • Status chip         │  [Accept Selected]       │
│                        │  [Reject All]            │
│  Running tasks show    │  Confidence score badge  │
│  spinner + progress    │  Source attribution      │
└────────────────────────┴──────────────────────────┘
```
- Running agent task: persistent banner at top with progress ("Researching 12 ancestors…")
- Accepted actions: green toast + item removed from inbox
- Rejected actions: item fades out
- Empty state: "Your research inbox is clear. Run the AI Research Agent to find new information about your ancestors." + [Start Research] CTA
- New actions badge in sidebar nav item

### Document Vault
```
┌───────────────────────────────────────────────────┐
│  HEADING: "Documents" (Fraunces 28px)              │
│  Sub: "N documents — photos, certificates, letters"│
├──────────────────────┬────────────────────────────┤
│  FILTER SIDEBAR      │  DOCUMENT GRID             │
│  • All Documents     │  Cards: thumbnail + title  │
│  • By category       │  + person name + date      │
│  • By person         │  Hover: quick actions      │
│  • Unlinked          │  (view, edit, delete)      │
│                      │  Click: lightbox / preview │
└──────────────────────┴────────────────────────────┘
```
- Document cards: parchment background, border, subtle shadow
- Image thumbnails cropped square; PDF shows document icon
- Category chips in amber
- Upload button: always visible top-right, Instrument Sans 500
- Empty state per category: "No [certificates] yet. [Upload a document]" with warm illustration
- Drag-and-drop upload zone (dashed amber border on drag-over)

### "Who's Missing?" Tree Audit
```
┌───────────────────────────────────────────────────┐
│  HEADING: "Tree Completeness" (Fraunces 28px)      │
│  Sub: "N gaps found across your tree"              │
├───────────────────────────────────────────────────┤
│  COMPLETENESS SCORE BAR                           │
│  Forest green fill, labeled "N% complete"         │
├──────────────────────────────────────────────────┤
│  GAPS LIST (grouped by type)                      │
│  Group: "Missing parents" (N people)              │
│    ↳ [Person name] — born 1847, no parents listed │
│       [Add parents] [Dismiss]                     │
│  Group: "Incomplete vital records" (N people)     │
│  Group: "No biography" (N people)                 │
│    ↳ [Person name] [Generate] [Dismiss]           │
└───────────────────────────────────────────────────┘
```
- Gap items: person avatar + name (Fraunces) + explanation (Source Serif 4) + CTA
- CTAs in --forest; dismiss in text-muted
- Dismissed items hidden; "Show dismissed (N)" toggle at bottom
- Empty state: large Fraunces "100%" score + "Your tree is complete — no gaps found." in Source Serif 4 italic

### Admin Data Tables (People List, Families List)
```
┌────────────────────────────────────────────────────┐
│  HEADING: "People" (Fraunces 28px)  [+ Add Person] │
│  Search input (full width, parchment-3 bg)         │
├────────────────────────────────────────────────────┤
│  TABLE                                             │
│  Col: Name (Fraunces 15px, link to person)        │
│  Col: Born (Geist Mono, tabular-nums)             │
│  Col: Birthplace (Source Serif 4, muted)          │
│  Col: Actions (Edit / View — Instrument Sans)     │
│  Row hover: parchment-3 bg                        │
│  Pagination: Instrument Sans, forest links        │
└────────────────────────────────────────────────────┘
```
- Table headers: Instrument Sans 11px, 600 weight, ALL CAPS, `--brown-muted`
- Empty table: warm message + [Add First Person] CTA
- Bulk actions bar appears on row select (fixed at bottom)

### Auth Pages (Login, Signup, Forgot/Reset Password)
- Centered single-column layout, max-width 420px
- Logo "Heirloom" in Fraunces italic, centered above form
- Background: `--parchment` (same as app — no separate "auth background")
- Form card: `--parchment-2` bg, subtle border, `--radius-xl` (16px)
- Input labels: ALL CAPS Instrument Sans, `--brown-muted`
- Primary CTA: forest green full-width button
- Links: `--forest`, hover underline

**Page copy — login:**
- H1: "Sign in to Heirloom" (Fraunces 30px, `--brown-text`)
- Subhead: "Your family's living history" (Source Serif 4 italic, `--brown-muted`)
- Bottom links: "Forgot password?" left | "Sign up" right — Instrument Sans 14px, `--forest`

**Page copy — signup:**
- H1: "Start your family history" (Fraunces 30px, `--brown-text`) — NOT "Request access"
- Subhead: "Your tree. Your story. Private." (Source Serif 4 italic, `--brown-muted`)
- Primary CTA button: "Create account" — NOT "Request access"
- Bottom link: "Already have an account? Sign in"
- Remove all "invite-only" and "admin approval" language entirely

**Screen hierarchy — login:**
```
1st: Logo (Heirloom wordmark, Fraunces italic, amber on last letter)
2nd: Heading + subhead
3rd: Google button → Apple button (most users take these paths)
4th: "or" divider
5th: Email/password form
6th: Forgot password / Sign up links
```

**Screen hierarchy — signup:**
```
1st: Logo
2nd: "Start your family history" + subhead
3rd: Google button → Apple button
4th: "or" divider
5th: Name / email / password form
6th: "Create account" button
7th: "Already have an account? Sign in"
```

**OAuth buttons (Google / Apple):**
- Appear above the email/password form, separated by an "or" divider (`--border-light` hairlines + Instrument Sans 12px "or" centered)
- **Google:** follows Google brand guidelines exactly — white/light bg, Google logo SVG, "Continue with Google" in Roboto (Google's requirement). Border: `--border`, 1px. Radius: `--radius-md` (6px). Full width. Height: 44px (touch target).
- **Apple:** follows Apple HIG — black background, white Apple logo SVG, "Continue with Apple" in San Francisco / system-ui. Radius: `--radius-md`. Full width. Height: 44px. Dark mode: white bg, black text (Apple requirement).
- Order: Google → Apple → divider → email form. Most common provider first.
- OAuth buttons use standard brand styles even though they deviate from the Heirloom palette — this is a brand compliance requirement, not a design inconsistency.
- On mobile, both OAuth buttons are stacked, full width, with 8px gap between them.
- `aria-label` for Google button: "Continue with Google" (matches visible text — no change needed)
- `aria-label` for Apple button: "Continue with Apple" (matches visible text — no change needed)
- Apple button dark mode: black bg (#000) with white text — contrast ratio ~21:1 ✓; light bg (#fff) with black text on dark app background fails WCAG against `--parchment-3` behind the form card, so ensure Apple button is rendered within the card (parchment-2 bg), not against the page background

### Email Verification Banner
Shown on every authenticated page until the user verifies their email. Soft block — the user can use the full app, but the banner persists.

```
┌──────────────────────────────────────────────────────────────┐
│  ⚑  Please verify your email — we sent a link to            │
│     user@example.com.  [Resend email]  [×]                   │
└──────────────────────────────────────────────────────────────┘
```
- Position: fixed top of page, above all content (not inside the sidebar or nav)
- Background: `--amber-bg` (`#FDF3E4`); border-bottom: 1px solid `--amber-light`
- Icon `⚑`: amber color (`--amber`)
- Body text: Instrument Sans 14px, `--brown-text`
- Email address: Geist Mono, `--brown-2`
- "Resend email": `--forest`, underline on hover; clicking debounces 60s and shows "Email sent" confirmation inline
- Dismiss `[×]`: `--brown-muted`; dismisses for the session only (banner returns on next login until verified)
- Height: 44px single-line on desktop; auto-height on mobile if email wraps
- No banner once `emailVerified` is set — do not show a "verified" success toast (unnecessary noise)
- **Keyboard:** dismiss button is Tab-focusable; `aria-label="Dismiss verification banner"`; visible focus ring (3px `--forest`)
- **Mobile:** banner text truncates at one line on small screens — long email addresses truncated with ellipsis, not wrapping to two lines (preserve 44px height)

### Onboarding Wizard
Shown after any signup (credentials, Google, or Apple) when the user has 0 tree memberships. Route: `/onboarding`. Skipped if the user already has a tree or has accepted an invite.

**Routing logic (applies to all signup methods):**
- After any successful sign-in or sign-up: check `TreeMember` count for the user
- If `count === 0` → redirect to `/onboarding`
- If `count >= 1` → redirect to `/dashboard` (or `callbackUrl` if set)
- This is method-agnostic: credentials, Google, or Apple all follow the same logic
- If a user signs up via credentials, then later signs in via Google with the same email, NextAuth links the accounts automatically — they go to `/dashboard` like any return visit, no special message needed

**Wizard layout:**
```
┌────────────────────────────────────────────────────────┐
│  Heirloom  (Fraunces italic, centered, amber accent)   │
│                                                        │
│  "Your ancestors are waiting."  (Fraunces 36px)         │
│  "Let's build your tree."                              │
│  (Source Serif 4 italic, --brown-muted, 18px)          │
│                                                        │
│  ┌──────────────────┐   ┌──────────────────────────┐  │
│  │  Build your tree │   │  Join a family tree      │  │
│  │                  │   │                          │  │
│  │  [tree icon]     │   │  [invite icon]           │  │
│  │                  │   │                          │  │
│  │  Start fresh or  │   │  Someone sent you a      │  │
│  │  import a GEDCOM │   │  link — enter the code   │  │
│  └──────────────────┘   └──────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```
- Page background: `--parchment`
- Two option cards: `--parchment-2` bg, `--border` border, `--radius-xl`, 40px padding
- Card hover: `--parchment-3` bg, border shifts to `--forest` (1px)
- Selected card: `--forest-bg` bg, `--forest` border (2px), forest checkmark top-right
- Icons: simple line icons in `--forest`, ~40px

**Path A: Create a new tree**
```
Step 1 of 2 — "Name your tree"
┌─────────────────────────────────────┐
│  Tree name                          │
│  [________________] input           │
│  "e.g. The Gaasch Family"           │
│  (Instrument Sans 13px, --brown-muted)│
│                                     │
│  [ Continue → ]  (forest button)    │
└─────────────────────────────────────┘

Step 2 of 2 — "Import your family data (optional)"
┌─────────────────────────────────────┐
│  "Have a GEDCOM file?"              │
│  (Source Serif 4, 16px)             │
│                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │   Drop your .ged file here    │  │
│  │   or [browse files]           │  │
│  │   (dashed amber border on     │  │
│  │    drag-over, otherwise       │  │
│  │    --border-light)            │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                     │
│  "GEDCOM is a standard export from  │
│   Ancestry, FamilySearch, and most  │
│   genealogy software."              │
│  (Source Serif 4 italic, 14px, muted)│
│                                     │
│  [ Skip for now ]  [ Import & Finish]│
└─────────────────────────────────────┘
```
- Step indicator: Instrument Sans 12px, ALL CAPS, `--brown-muted`. E.g. "STEP 1 OF 2"
- Progress: thin amber line under the header, 50% / 100% fill
- GEDCOM upload during import: show progress bar (`--forest` fill) + "Importing N of M people…"
- After completion → redirect to `/trees/[new-slug]`

**Path B: Enter invite code**
```
┌─────────────────────────────────────┐
│  "Enter your invite code"           │
│  (Fraunces 24px)                    │
│                                     │
│  [________________________] input   │
│  Geist Mono, placeholder "abc-xyz"  │
│                                     │
│  [ Join Tree ]  (forest button)     │
│                                     │
│  "Don't have a code? Ask the tree   │
│   admin to send you an invite."     │
│  (Source Serif 4 italic, 14px, muted)│
└─────────────────────────────────────┘
```
- Invalid code: inline error below input, `--error` color, Instrument Sans 14px. "That code is invalid or has expired."
- Success: → redirect to `/trees/[slug]` with a brief welcome toast: "Welcome to [Tree Name]."

### Welcome Email
Sent after any signup (credentials, Google, Apple). Single-purpose: confirm the account, set the tone, direct to onboarding.

**Structure:**
```
[Heirloom wordmark — Fraunces italic, centered]

────────────────────────────────────

Your family history starts here.

We're glad you're here, {first_name}. Heirloom is your
private space to build, explore, and share your family tree
— enriched by AI-generated biographies and records from
across the world.

[Start building your tree →]   ← forest green button, full width

────────────────────────────────────

If you didn't create this account, you can safely ignore
this email.
```
- Background: `#FAF5EC` (parchment — not white)
- Font: email-safe serif stack for body (`Georgia, 'Times New Roman', serif`); wordmark rendered as text in a web font via font embedding or image fallback
- CTA button: `#2D4A35` (forest green), white text, 6px radius
- No hero image, no icon grid, no social links — just the message
- `EMAIL_FROM` display name: "Heirloom" (not "noreply@…")
- Subject line: "Your family history starts here" — matches the email heading

**Wizard interaction states:**

| State | Loading | Error | Success |
|-------|---------|-------|---------|
| Create tree | — | "That name is taken — try another" inline | → Step 2 |
| GEDCOM import | Progress bar + "Importing N of M people…" | "Import failed at line N: [message]" red alert | Green alert "N people imported" → redirect |
| Join with code | Spinner inside button | "Invalid or expired code" inline | "Welcome to [Tree Name]" toast → redirect |

**Mobile onboarding layout (≤640px):**
- Path selection cards: stack vertically (single column), full width, 16px gap
- Each card: 80px height on mobile (compressed from desktop), icon 28px
- Step 2 GEDCOM drop zone: becomes a tap-to-browse button on mobile (drag-and-drop not applicable)
- "Skip for now" / "Import & Finish" buttons: stack vertically, full width on mobile

**Keyboard & accessibility:**
- Path selection cards: focusable with Tab; `role="button"` or `<button>` wrapper; Enter/Space to select
- GEDCOM file input: visible "Browse files" button with keyboard focus; `accept=".ged,.gedcom"` attribute
- Progress step indicator: `aria-label="Step 1 of 2"` on the step counter element
- Invite code input: `type="text"` not `type="number"` (invite codes may have dashes/letters)

**Onboarding tone:**
- Warm and purposeful. Not gamified. Not "Let's get you set up!" energy.
- "Your ancestors are waiting." not "You're almost there! 🎉"
- "Skip for now" is always available — never trap the user in a wizard.

### Mobile Navigation (≤768px)
- Sidebar becomes bottom navigation bar: 5 icons max (Explorer, Directory, Chat, Inbox, More)
- "More" opens a slide-up sheet with remaining nav items
- Chat button moves to FAB (floating action button) bottom-right, forest green
- Person page: single column, sidebar data moves below biography
- Map page: full-width map, list collapses to "Show list" drawer

### Mobile Tree Explorer (≤768px)
The interactive graph visualization is **desktop/tablet only** (≥768px). On mobile:
- "Explorer" tab in bottom nav opens the **Directory** (searchable list) instead
- Each person page on mobile shows a **Family Strip** at the top: tappable avatar chips for Father, Mother, Spouse(s), and Children — allows mobile navigation between family members without a graph
- Family strip: horizontal scroll of chips with initials avatar + first name (Fraunces 13px), forest green border on active person
- This pattern preserves the "exploration" feeling on mobile in a touch-native way

## Interaction States

| Feature | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Tree Explorer | Skeleton cards (parchment pulse) | "No one here yet — [Add your first person]" in Fraunces | "Couldn't load tree. [Retry]" | Person panel slides in | — |
| Person Page | Skeleton (avatar circle + text lines) | — (always has data) | "Couldn't load this person. [Go back]" | Full page renders | Narrative loading: spinner + "Generating…" |
| Narrative Generation | Streaming text in Source Serif 4, amber cursor | [Generate Biography] CTA shown | "Generation failed. [Try again]" amber alert | Green toast "Biography saved" | Partial text visible while streaming |
| Chat Panel | Typing indicator (3 dots, forest) | "Ask me anything about your family tree." in Source Serif 4 italic | "Couldn't connect. [Retry]" | Response streams in | Tool call status: "Searching the tree…" in muted italic |
| Record Hints | Spinner in badge | No hints badge shown | "Search failed" 5-sec toast | "Found N hints" 5-sec toast + badge updates | — |
| GEDCOM Import | Progress bar + "Importing N of M people" | "No file selected — drag a .ged file here" (dashed border) | "Import failed at line N: [error]" red alert | Green alert "N people, N families imported" | Partial: shows progress percentage |
| External Record Match Review | Skeleton diff table | "No matches to review" | "Couldn't load match data" | Green toast "Fields imported" | Checkboxes pre-selected for high-confidence fields |
| Agent Research Inbox | Spinning indicator on task card | "Research inbox is clear." + Start CTA | "Agent task failed. [View error] [Retry]" | Green toast per accepted action | Running task shows progress banner |
| Geographic Map | Map tiles loading (progressive) | "No locations yet. Add birth places to your people." | "Map failed to load. [Retry]" | Points appear as geocoded | Partial: some points shown, others loading |
| Family Statistics | Skeleton charts (pulse animation) | "Add at least 10 people to see statistics." | "Couldn't load statistics. [Retry]" | Charts render | Partial: some charts ready, others loading |
| Document Vault | Skeleton grid | "No documents yet. [Upload your first document]" | Upload failed: "Upload failed. File may be too large (max 20MB)." | Green toast "Document uploaded" | — |
| Who's Missing Audit | Skeleton gap list | "100% complete — no gaps found." (celebration) | "Couldn't run audit. [Retry]" | Gap list renders | — |
| EU Eligibility Checker | "Analyzing your tree…" spinner | "Add ancestors with European birth places to check eligibility." | "Analysis failed. [Retry]" | Cards per country (likely/possible/insufficient) | — |
| Heritage Card | "Generating your card…" spinner | No ancestors in line: "Add parents to generate a heritage card." | "Card generation failed. [Retry]" | Card renders + share button | — |
| Tree Member Invite | Sending spinner | No members: "Invite family members to collaborate." + [Invite] CTA | "Invite failed. Check the email address." | Green toast "Invitation sent to [email]" | — |
| OAuth Login (Google/Apple) | Button replaced by spinner (inline) | "Could not sign in with Google/Apple. Try again or use email." — amber inline alert | → Dashboard or /onboarding | — | — |
| Signup — duplicate email | — | — | "An account with that email already exists. [Sign in instead]" — inline error with forest-colored link to /login | — | — |
| Email Verification | "Sending…" inline next to Resend link | "Couldn't send — try again in a moment." | Banner disappears; no success toast | — | — |
| Onboarding — Create Tree | — | "That name is already taken." inline | → Step 2 (GEDCOM prompt) | — | — |
| Onboarding — GEDCOM Import | Progress bar + "Importing N of M people…" | Red alert "Import failed at line N: [message]" with skip option | Green alert "N people, N families imported" → /trees/[slug] | Partial: progress shown | — |
| Onboarding — Join with Code | Spinner in button | "That code is invalid or expired." inline | "Welcome to [Tree Name]." toast → /trees/[slug] | — | — |

## User Journey & Emotional Arc

### Journey 1: First-time user, new empty tree
```
STEP | USER DOES              | SHOULD FEEL           | DESIGNED BY
-----|------------------------|----------------------|----------------------------------
1    | Logs in for first time  | Welcomed, not lost   | Dashboard headline in Fraunces;
     |                        |                      | "Your tree is waiting" copy
2    | Creates a tree          | Purposeful           | Clean form, forest green CTA
3    | Sees empty explorer     | Inspired, not       | Empty state: warm illustration +
     |                        | overwhelmed          | "Add the person you know best first"
4    | Adds first person       | Satisfied            | Person name appears in Fraunces —
     |                        |                      | big, beautiful, real
5    | Generates first bio     | Delighted, surprised | Streaming text feels alive;
     |                        |                      | "It's writing about my ancestor"
6    | Returns next day        | Remembered           | Today card surfaces a birthday;
     |                        |                      | "feels like it knows my family"
```

### Journey 2: Power user, large tree, research mode
```
STEP | USER DOES              | SHOULD FEEL           | DESIGNED BY
-----|------------------------|----------------------|----------------------------------
1    | Opens Research Inbox    | In control           | Task list is scannable; no noise
2    | Reviews agent proposal  | Trust, not anxiety   | Diff is clear; each change explained
3    | Accepts fields          | Efficient            | One-click accept; feedback immediate
4    | Views updated person    | Connected            | Person page shows new data clearly
5    | Generates narrative     | Proud                | Better bio because of new data
6    | Shares heritage card    | Joyful               | Card is beautiful enough to share
```

### Journey 3: New user, OAuth signup + GEDCOM import
```
STEP | USER DOES              | SHOULD FEEL           | DESIGNED BY
-----|------------------------|----------------------|----------------------------------
1    | Lands on /signup        | Safe, familiar       | Google/Apple buttons prominent;
     |                        |                      | no email required for OAuth
2    | Taps "Continue with    | Trusted              | Native Google/Apple sheet appears;
     | Google"                |                      | returns seamlessly
3    | Lands on /onboarding   | Guided, not lost     | Two clear paths; warm tone
4    | Chooses "Start a tree" | Purposeful           | One field, clean form
5    | Sees GEDCOM prompt     | Relieved (easy path) | "Skip for now" always visible;
     |                        |                      | drag-drop feels familiar
6    | Imports .ged file      | Impressed            | Progress bar; "N people imported"
7    | Lands on tree explorer | Amazed               | Their family, already beautiful
```

### Journey 4: Casual family member (viewer role)
```
STEP | USER DOES              | SHOULD FEEL           | DESIGNED BY
-----|------------------------|----------------------|----------------------------------
1    | Follows invite link     | Welcome, not confused| Invitation page explains the tree
2    | Sees tree explorer      | Curious, not lost    | Default person centered; clear nav
3    | Clicks ancestor         | Fascinated           | Person page feels like a book page
4    | Reads biography         | Moved                | Source Serif 4 at proper size;
     |                        |                      | pull quotes for key moments
5    | Browses map             | Wonder               | Seeing family migrate across a map
6    | Shares heritage card    | Identity, pride      | The artifact is worth sharing
```

### Files to delete as part of open signup
- `app/awaiting-approval/page.tsx` — dead code once open signup ships
- Remove the `pending` role redirect block from `src/middleware.ts`

### Auth Page Copy Changes (required for open signup)
These specific strings in the existing code MUST change:
| Current copy | New copy | File |
|---|---|---|
| "Request access" (H1) | "Start your family history" | `app/signup/page.tsx` |
| "Heirloom is invite-only. An admin will approve your account." | "Your tree. Your story. Private." | `app/signup/page.tsx` |
| "Request access" (button label) | "Create account" | `app/signup/page.tsx` |
| "No account? Request access" | "No account? Sign up" | `app/login/page.tsx` |
| "Request submitted" (success state) | Redirect to /onboarding directly | `app/signup/page.tsx` |
| "An admin will review your request…" | Remove entirely | `app/signup/page.tsx` |

### Tone Rules (apply to all copy)
- **Headings:** Dignified, factual. Never "Amazing!" or "Wow!". Let the content be the wow.
- **Empty states:** Warm and directional. "Your ancestors are waiting to be found."
- **Error states:** Honest and calm. "Something went wrong — [action to fix it]."
- **Success states:** Brief and grounded. "Biography saved." not "Great job! 🎉"
- **AI disclaimer:** Gentle, not alarming. "AI narratives bring data to life — always verify with primary sources."

## Empty State Design Rules
1. **Never** use "No items found." — always explain *why* it's empty and what to do next.
2. Every empty state has: a brief explanation (Source Serif 4 italic, muted), a primary CTA (forest green button), and optionally a secondary action.
3. Empty states that represent achievement (100% tree completeness, clear research inbox) use warm celebration language — not neutral UI copy.
4. First-time empty states (new tree, first visit) are warmer and more instructional than repeat empty states (e.g., after clearing the inbox).

- **WCAG Target:** AA (contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text)
- **Verified combinations:**
  - `#2C1A0E` on `#FAF5EC`: ratio ~14:1 ✓
  - `#FAF5EC` on `#2D4A35`: ratio ~9:1 ✓
  - `#C9974A` on `#FAF5EC`: ratio ~3.2:1 — amber only used for decorative/large text, never small body text
- **Keyboard nav:** All interactive elements reachable by Tab. Focus rings: 3px solid `--forest` with 2px offset.
- **ARIA:** All nav landmarks, dialog roles, and live regions must be implemented. Chat panel = `role="dialog" aria-live="polite"`.
- **Touch targets:** Minimum 44×44px for all interactive elements on mobile.
- **Reduced motion:** All animations respect `prefers-reduced-motion: reduce` — skip all transitions, keep instant state changes.

## AI Slop Anti-Patterns (never do these)
- No purple/violet gradients
- No 3-column icon grid for features
- No gradient buttons as primary CTA
- No centered hero with stock photography
- No uniform bubbly border-radius on everything
- No "Built for families" / "Designed for you" marketing copy in the UI

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-18 | Forest green as primary interaction color | Distinctive in genealogy space; thematic (family *tree*); pairs beautifully with parchment |
| 2026-03-18 | Fraunces for person names | Optical variable serif; feels like a printed book; handles italic beautifully for name emphasis |
| 2026-03-18 | Source Serif 4 for narrative body | Best-in-class readable serif for long-form digital text; optical sizing for small and large |
| 2026-03-18 | Parchment cream background, not white | Avoids clinical look; warm without being garish; all competitors use white |
| 2026-03-18 | Persistent sidebar, never hamburger on desktop | App you inhabit, not pages you visit |
| 2026-03-18 | Geist Mono for all date/place/ID data | Tabular-nums for date alignment; technical precision contrasts with warm editorial type |
| 2026-03-18 | Light + dark + system theme modes | First-class feature; CSS custom properties; no flash on load |
| 2026-03-18 | Mobile tree explorer = Directory + Family Strip | Graph can't be used meaningfully on phone; Directory + per-person family chip strip preserves exploration feel |
| 2026-03-18 | Chat panel = bottom sheet (60vh) | Consistent across mobile/desktop; conversational feel; doesn't fight the content behind it |
| 2026-03-18 | Heritage card: paternal / maternal / custom path | Three modes give flexibility; custom picker lets user trace any ancestor line |
| 2026-03-18 | Person avatars: AI-recommended portrait detection | When photo uploaded, AI suggests if it's a good portrait; one-tap to confirm as avatar |
| 2026-03-18 | OAuth buttons (Google/Apple) use brand-required styles | Google and Apple mandate specific visual treatments; compliant even though they deviate from parchment palette |
| 2026-03-18 | Email verification = soft block with persistent banner | Users can access the app immediately; banner is amber (not red) — informative, not alarming |
| 2026-03-18 | Onboarding wizard at /onboarding, 2-path (create / join) | Avoids blank-slate confusion on first login; GEDCOM import in Step 2 means early users can have a full tree in minutes |
| 2026-03-18 | Onboarding GEDCOM import is optional ("Skip for now") | Never trap the user; the app is useful without a GEDCOM file |
