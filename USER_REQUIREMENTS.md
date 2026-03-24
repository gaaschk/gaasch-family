# User Requirements Document
## Family History Platform

**Version:** 1.0
**Date:** March 2026
**Purpose:** Specification document for recreating the Family History platform from scratch.

---

## 1. Overview

A **multi-tenant private family history web application**. Multiple families can each own a private genealogy tree. Each tree has its own members, data, and settings. New users can sign up freely and immediately create their own trees or be invited to existing ones by tree admins.

### 1.1 Landing Page Design (`/`)

The platform landing page is the first impression for unauthenticated visitors.

**Layout:**
- Full-viewport hero section — parchment gradient (#FAF5EC → #F2EBE0), no card, no container
- Left column (55% width): vertically centered text content
  - "Heirloom" — Fraunces 72–96px `display-xl`, brown-text (#2C1A0E), no tagline prefix
  - Tagline: "Your family's story. Private, beautiful, yours." — Source Serif 4 20px light italic, brown-2, max 400px
  - Amber rule (2px, 48px wide) — left-aligned separator
  - CTA group: "Get started" (forest green filled, 48px height, 160px min-width) + "Sign in" (ghost forest border, same height). Gap: 16px. Left-aligned (not centered).
- Right column (45% width): muted pedigree chart SVG
  - A static, pre-rendered SVG of a typical 3-generation pedigree structure (boxes + connecting lines)
  - Color: amber-light (#E6BC7A) at 35% opacity — visible but never competing
  - Node labels intentionally absent (privacy + intrigue)
  - Slightly rotated (-5°) for organic feel. Overflows right edge intentionally.
  - Not interactive on landing page.

**Feature row (below hero, no divider — just spacing):**
- 3 text blocks, left-aligned, 32-col each — NO icons, NO cards, NO circles
- "Build your tree." — Fraunces 22px heading + Source Serif 4 15px body (2 sentences max)
- "Explore your ancestors." — same treatment
- "Bring them to life with AI." — same treatment
- Spacing between blocks: 48px horizontal gap

**Footer:** forest bg (#2D4A35), cream text. Privacy · Terms · © Heirloom [year]. Minimal.

**Authenticated user redirect:** Visiting `/` while logged in → immediate redirect to `/home`. Landing page never shown to authenticated users.

### Core Capabilities
- Interactive family tree explorer
- Searchable people directory
- AI-generated biographical narratives
- Conversational AI assistant for querying the tree
- External record matching (FamilySearch, WikiTree, Geni)
- GEDCOM import and export
- Role-based access control at both platform and tree level

---

## 2. URL Structure

```
/                         Platform landing page
/home                     Authenticated dashboard (tree list)
/login                    Sign in (email/password or Google)
/signup                   Create account
/forgot-password          Password reset request
/set-password             Set password from email link
/awaiting-approval        Holding page for pending users

/trees/new                Create a new tree
/trees/[slug]/            Tree explorer (main public view)
/trees/[slug]/stories/[personId]  Lineage story for a person

/trees/[slug]/admin/              Tree admin shell
/trees/[slug]/admin/people        People list + CRUD
/trees/[slug]/admin/people/new    Add person
/trees/[slug]/admin/people/[id]/edit  Edit person
/trees/[slug]/admin/families      Families list + CRUD
/trees/[slug]/admin/families/new  Add family
/trees/[slug]/admin/families/[id]/edit  Edit family
/trees/[slug]/admin/members       Invite + manage tree members
/trees/[slug]/admin/settings      Tree configuration
/trees/[slug]/admin/import        GEDCOM file import
/trees/[slug]/admin/familysearch  FamilySearch OAuth connection
/trees/[slug]/admin/geni          Geni OAuth connection

/trees/[slug]/eligibility/        EU citizenship eligibility checker

/admin/                   Platform admin dashboard
/admin/users              Manage all platform users + roles
/admin/settings           System-wide settings (API keys, credentials)

/invite/[token]           Accept tree invitation
/privacy                  Privacy policy
/tos                      Terms of service
```

---

## 3. Authentication & User Management

### 3.1 Sign-In Methods
- **Email + password** — passwords securely hashed
- **Google OAuth** — sign in with Google account

### 3.2 Account Creation Flow
1. User fills in name, email, and password at `/signup`
2. Account created with **viewer** role — immediately active
3. User is redirected to `/login` with a success banner ("Account created! Sign in to get started.")
4. After signing in, user can create trees or be invited to existing ones

### 3.3 Password Reset Flow
1. User submits email at `/forgot-password`
2. System sends reset link (1-hour expiry)
3. User sets new password at `/set-password?reset=1`

### 3.4 Platform Roles
Roles are hierarchical. Each level inherits all permissions below it.

| Role | Level | Capabilities |
|------|-------|--------------|
| `pending` | -1 | Cannot access anything; redirected to `/awaiting-approval` |
| `viewer` | 0 | Can view trees they are a member of |
| `editor` | 1 | Can create trees; edit content within trees they have editor access to |
| `admin` | 2 | Full platform access; manage users; access system settings |

### 3.5 Session
- JWT strategy, 30-minute expiry
- Token carries `id` and `role` fields
- Session renewed on each request within the 30-minute window

### 3.6 Auth Page Design (Login, Signup, Password Reset, Set Password)

**All auth pages share the same layout:**
- Background: `--parchment` (#FAF5EC) full-bleed — warm, not white
- Centered content column: max 400px, vertically centered in viewport
- Top: "Heirloom" wordmark — Fraunces 28px, brown-text, centered, links to `/`
- Below wordmark: a rotating historical quote about family or memory — Source Serif 4 15px italic, brown-muted, centered, max 320px. Example: *"In family life, love is the oil that eases friction."* — Friedrich Nietzsche. Quotes change per page but are static (not randomized at runtime).
- Form card: parchment-2 (#F2EBE0) bg, 2px border (border-light), 16px radius, 32px padding
  - Form title: Instrument Sans 17px 600, brown-text (e.g., "Sign in to Heirloom")
  - Labels: Instrument Sans 12px 600, brown-2, letter-spacing 0.08em, ALL-CAPS
  - Inputs: 44px height, parchment bg, border (border), 8px radius, Instrument Sans 15px, brown-text. Focus: forest green border (2px).
  - Primary button: forest green filled (#2D4A35), white text, Instrument Sans 14px 600, 44px height, full-width, 8px radius
  - Secondary links (e.g., "Forgot password?", "Create an account"): Instrument Sans 13px, forest green, no underline default, underline on hover
- Google OAuth button (signup/login only): white bg, 1px border (#C4B09A), Google icon (SVG) + "Continue with Google" — Instrument Sans 14px 500, centered icon+text, 44px height, full-width, 8px radius. Below the primary button, separated by "or" divider (horizontal rules + centered "or" in brown-muted).
- Error state: red text (#8B2020) Instrument Sans 13px, appears below the relevant field (inline) or below the button (form-level).
- Success banner (on redirect to /login after signup): parchment-3 bg, amber border-left (3px), body text, auto-dismiss after 5s.

### 3.7 Awaiting Approval Page Design (`/awaiting-approval`)

- Background: `--parchment` (#FAF5EC) full-bleed
- Centered content, vertically centered, max 480px
- Top: Heirloom wordmark (Fraunces 28px, centered, links to `/`)
- Amber horizontal rule (2px, 64px wide, centered) — decorative separator
- Heading: "Your account is being reviewed" — Fraunces 36px 400, brown-text, centered
- Body: Source Serif 4 17px, brown-text, 1.7 line-height, centered, max 400px:
  *"We personally review each new account before granting access. You'll receive a confirmation email within 24 hours. If you have questions, reach out at [contact email]."*
- Contact link: forest green, Instrument Sans 13px
- Sign-out link: "Not you? Sign out" — body-sm, brown-muted, below body text
- No sidebar, no navigation, no chat button. Intentionally quiet.

### 3.6 Middleware Behavior
- Unauthenticated users visiting `/home`, `/trees/*`, `/invite/*` → redirect to `/login`
- Users with `pending` role → redirect to `/awaiting-approval`
- Authenticated users visiting `/` → redirect to `/home`

---

## 4. Tree Management

### 4.1 Creating a Tree
Fields: name (required), slug (auto-generated from name, alphanumeric + hyphens, unique), description (optional).
The creating user becomes the tree owner with admin role.

### 4.2 Tree-Level Roles
| Role | Capabilities |
|------|--------------|
| `viewer` | Read-only: browse people, read narratives, view families |
| `editor` | All viewer permissions + add/edit people/families, generate narratives, search external records, accept/reject record matches |
| `admin` | All editor permissions + manage members, manage settings, import/export GEDCOM, delete tree |

### 4.3 Tree Settings (per-tree key/value store)
- `default_person_id` — Person to show on load
- `api_token` — Bearer token for headless API access (scripts, automation)
- `anthropic_api_key` — Override global Claude key for this tree
- `anthropic_model` — Claude model for narratives/chat in this tree

---

## 5. Data Models

### 5.1 Person
| Field | Type | Notes |
|-------|------|-------|
| id | unique ID | Primary key |
| treeId | string | Foreign key to Tree |
| gedcomId | string? | Original GEDCOM identifier (@I123@) |
| name | string | Full name |
| sex | string? | M / F |
| birthDate | string? | Free-form text (e.g. "15 JAN 1920") |
| birthPlace | string? | Free-form text |
| deathDate | string? | Free-form text |
| deathPlace | string? | Free-form text |
| burialDate | string? | |
| burialPlace | string? | |
| occupation | string? | |
| notes | string? | Free-form notes |
| narrative | string? | HTML — AI-generated biography |
| fsPid | string? | FamilySearch person ID |

Unique constraint: `(treeId, gedcomId)` when gedcomId is present.

### 5.2 Family
| Field | Type | Notes |
|-------|------|-------|
| id | unique ID | Primary key |
| treeId | string | Foreign key to Tree |
| gedcomId | string? | Original GEDCOM identifier (@F123@) |
| husbandId | string? | Foreign key to Person |
| wifeId | string? | Foreign key to Person |
| marrDate | string? | |
| marrPlace | string? | |

Children linked via `FamilyChild` join table `(familyId, personId)`.

### 5.3 FamilySearchMatch (record hints)
| Field | Type | Notes |
|-------|------|-------|
| id | unique ID | |
| personId | string | FK to Person |
| treeId | string | FK to Tree |
| source | string | `familysearch` / `wikitree` / `geni` |
| fsPid | string | External person ID |
| score | float | Match confidence 0–100 |
| fsData | string | JSON — external person summary |
| status | string | `pending` / `accepted` / `rejected` |

Unique constraint: `(personId, source, fsPid)`.

### 5.4 LineageStory
| Field | Type | Notes |
|-------|------|-------|
| id | unique ID | |
| treeId | string | FK to Tree |
| personIdsKey | string | Comma-separated person IDs defining the lineage line |
| html | string | Generated narrative story |

Unique constraint: `(treeId, personIdsKey)`.

### 5.5 AuditLog
| Field | Type | Notes |
|-------|------|-------|
| id | unique ID | |
| treeId | string | FK to Tree |
| userId | string | FK to User |
| tableName | string | e.g. `people` |
| recordId | string | |
| action | string | `create` / `update` / `delete` / `generate-narrative` |
| oldData | string? | JSON |
| newData | string? | JSON |

### 5.6 User
| Field | Type | Notes |
|-------|------|-------|
| id | unique ID | |
| email | string | Unique |
| emailVerified | DateTime? | |
| name | string? | |
| image | string? | |
| role | string | `pending` (default) / `viewer` / `editor` / `admin` |
| password | string? | Securely hashed; null for OAuth-only users |
| tokenVersion | int | For force-logout all sessions |

### 5.7 OAuth Token Models
**FamilySearchToken** and **GeniToken** — one per user, store `accessToken`, `refreshToken`, `expiresAt`, `displayName`, and provider-specific user ID. Auto-refresh on use.

### 5.8 TreeInvite
| Field | Type | Notes |
|-------|------|-------|
| id | unique ID | |
| treeId | string | FK to Tree |
| email | string | Invitee email |
| role | string | Role to assign on acceptance |
| token | string | Unique acceptance token |
| expiresAt | DateTime | |
| acceptedAt | DateTime? | Set when accepted |
| sentCount | int | Number of times invitation sent |
| lastSentAt | DateTime? | |

---

## 6. People & Families CRUD

### 6.1 People
- **Create**: All fields in §5.1 editable
- **Read**: Returns person + parents (via families as child) + spouses (via families as husband/wife) + children (via families as husband/wife + FamilyChild)
- **Update**: All fields
- **Delete**: Cascade — removes from families, matches, audit logs
- **Search**: Full-text name search with pagination (50 per page)
- **Contextual Add**: From a person's view, buttons to add parents, spouses, children directly

### 6.2 Families
- **Create**: Select husband and/or wife (optional), set marriage date/place
- **Update**: Change spouses, dates, places
- **Add children**: POST to `/families/[id]/children`
- **Delete**: Cascade
- **Pagination**: 50 per page in admin list

### 6.3 Cross-tenant Guard
Every people/family query must include `treeId` in the WHERE clause. No query should return data across tree boundaries.

---

## 7. GEDCOM Import & Export

### 7.1 Import
- Accept `.ged` file upload
- Parse GEDCOM 5.5.1 format
- Create or update Person records (match on `gedcomId`)
- Create or update Family records and FamilyChild links
- **Preserve existing narratives** — do not overwrite AI-generated content on update
- Idempotent: importing the same file twice is safe

### 7.2 Export
- Generate valid GEDCOM 5.5.1 file for the entire tree
- Include all Person and Family records
- File download with appropriate filename

---

## 8. AI Features

### 8.1 Narrative Generation
- **Trigger**: Editor clicks "Generate narrative" on a person
- **Process**: Constructs a prompt including the person's vital data + family relationships
- **Output**: HTML biographical narrative (target ~800–1200 words)
- **Streaming**: Response streams to client, displayed in real time
- **Saving**: Full HTML saved to `Person.narrative` after stream completes
- **Audit**: Logs old + new narrative
- **Model**: Configurable per tree (claude-sonnet-4-6 default, opus-4-6, haiku-4-5)
- **API key**: Per-tree override; falls back to global system setting
- **Headless script**: `generate-narratives.mjs` for bulk generation via CLI with `--tree`, `--token`, `--ids`, `--concurrency`

### 8.2 Conversational Chat Assistant
- Floating button (✦) opens a side panel from any tree page
- **Identity**: "Family Historian" — a persona focused on genealogy for the specific tree
- **Streaming**: NDJSON protocol — `{"t":"s","v":"status text"}` for status updates, `{"t":"d","v":"html chunk"}` for content
- **Heartbeat**: 5-second keepalive events to prevent proxy timeouts
- **Context**: Chat receives tree name, current person being viewed, user's role

**Tools available to all authenticated users:**
- `search_people` — search by name in the tree
- `get_person` — get full details including genealogy
- `list_people` — list people with sort options (oldest, youngest, name, no_narrative)
- `trace_line` — follow paternal or maternal line from a person
- `get_relatives` — get parents / children / spouses / siblings

**Tools available to editors/admins only:**
- `generate_narrative` — generate AI narrative for a person
- `search_external_matches` — search FamilySearch, WikiTree, Geni and store results as pending hints

**Output format**: HTML using CSS classes (`body-text`, `section-title`, `pull-quote`, `chat-person-link[data-id]`). Person links in chat output are clickable — clicking navigates the tree explorer to that person.

**Max iterations**: 8 tool-use passes per message.

### 8.3 Lineage Stories
- A "story" is an AI-generated narrative about a lineage line (sequence of people in a direct paternal or maternal chain)
- Generated via `POST /api/trees/[treeId]/generate-lineage-story` with an array of person IDs
- Stored in `LineageStory` keyed by `(treeId, personIdsKey)`
- Accessible publicly at `/trees/[slug]/stories/[personId]` (no login required to read)
- Editors can regenerate stories in-place

**Story page design** (`/trees/[slug]/stories/[personId]`):
- Background: `--parchment` (#FAF5EC) — warm, editorial
- Layout: centered column, max 720px, 48px top padding, 80px bottom padding
- Header: "[Name]'s Story" — Fraunces 48px 400, brown-text, no background
- Subtitle: "A lineage from [earliest ancestor] to [root person]" — Source Serif 4 18px light italic, brown-muted
- Thin amber rule (2px, 80px wide, centered) as section break below subtitle
- Body: Source Serif 4 17px 400, 1.8 line-height, max 65ch, brown-text. First paragraph: 20px, Source Serif 4 light italic (lead paragraph style)
- Drop cap on first letter: Fraunces 72px, brown-text, float left, 2-line span
- Person name mentions within text: Fraunces italic (same size as surrounding body) — not links on public page
- Footer: "Generated by Heirloom" — body-sm muted + link back to platform landing
- Back button (logged-in users only): "← Back to [Tree Name]" top-left, Instrument Sans 13px, forest green
- Regenerate button (editors only): top-right, ghost style, "Regenerate story"
- No sidebar. No nav. No chat button. Pure reading experience.

---

## 9. External Record Matching

### 9.1 Overview
Three sources are queried in parallel when a search is triggered. Results are stored as `FamilySearchMatch` records with `status = pending`. Editors review and accept or reject each match individually.

### 9.2 Sources

**WikiTree** (no auth required — always available)
- API: `https://api.wikitree.com/api.php?action=searchPerson`
- Parameters: `FirstName`, `LastName`, `BirthDate` (year), `limit`
- Response: JSON array `[{ status, matches: [...] }]`
- External person ID: WikiTree `Name` field (e.g. `Gaasch-7`)
- Scoring: Computed from birth year match (±10yr), birth place word overlap, death year match, name similarity. Base 55, max 95.

**FamilySearch** (requires user OAuth connection)
- User connects personal FamilySearch account via OAuth at tree admin → FamilySearch
- Search by name, returns results with lifespan + birth place
- Also supports ancestor import: given a FamilySearch person ID + generation depth (1–6), imports that person and all ancestors into the tree

**Geni** (requires user OAuth connection)
- User connects personal Geni account via OAuth at tree admin → Geni
- API: `https://www.geni.com/api/profile/search?names=<query>`
- Token exchange endpoint: `https://www.geni.com/platform/oauth/request_token`
- Single-result quirk: when exactly one match found, Geni returns the profile object directly instead of `{ results: [...] }`

### 9.3 Match Review Workflow
1. Matches arrive with `status = pending`
2. Hints badge appears on person in explorer (count of pending matches)
3. Editor opens hints panel, sees match cards with source badge (FamilySearch=green, WikiTree=blue, Geni=purple)
4. Each match shows: name, birth/death dates, birth/death places, occupation, score
5. Editor clicks **Review**: inline comparison table shows field-by-field diff (tree value vs. external value) with checkboxes
6. Editor selects which fields to import, clicks **Accept**
7. On accept: selected fields overwrite person data; if source is FamilySearch, `person.fsPid` is also set; match status → `accepted`
8. On reject: match status → `rejected`; data unchanged

---

## 10. Tree Member Management

### 10.1 Inviting Members
- Admin enters email address and selects role (viewer / editor / admin)
- If email already has a platform account: user is immediately added to the tree (no email sent)
- If email is new: `TreeInvite` record created, invitation email sent with acceptance link (7-day expiry)

### 10.2 Accepting an Invitation
- User clicks link in email → `/invite/[token]`
- If no account: prompted to sign up (then redirected back to accept)
- On accept: `TreeMember` record created with specified role

### 10.3 Managing Members
- Change role: dropdown per member (viewer / editor / admin)
- Remove member: removes `TreeMember` record
- Resend invite: regenerates token, sends new email, increments `sentCount`
- Revoke invite: deletes `TreeInvite` record

---

## 11. Platform Administration

### 11.1 User Management (`/admin/users`)
- List all users with email, display name, role, join date
- **Pending section**: Users awaiting approval — promote to viewer / editor / admin
- **Active section**: Change role of any user on-the-fly

### 11.2 System Settings (`/admin/settings`)
All stored as `SystemSetting` (global key/value). Secrets masked in UI.

| Setting | Key | Notes |
|---------|-----|-------|
| Anthropic API key | `anthropic_api_key` | For narrative generation + chat |
| Default Claude model | `anthropic_model` | claude-sonnet-4-6 / claude-opus-4-6 / claude-haiku-4-5-20251001 |
| Email SMTP server | `email_server` | Full SMTP connection string |
| Email from address | `email_from` | Display name + address |
| Email BCC | `email_bcc` | Optional copy of all outgoing email |
| FamilySearch client ID | `fs_client_id` | OAuth app |
| FamilySearch client secret | `fs_client_secret` | OAuth app |
| Geni client ID | `geni_client_id` | OAuth app |
| Geni client secret | `geni_client_secret` | OAuth app |
| GitHub token | `github_token` | Fine-grained PAT with Issues: Read & Write |
| GitHub repo | `github_repo` | `owner/repo` format |

---

## 12. Issue Reporting

A floating **⚑** button appears on every page (bottom-left corner) for authenticated users.

- Opens a modal with: type (bug / feature request / other), title, description
- Automatically attaches: current page URL, reporter email
- Submits to `POST /api/report-issue` which creates a GitHub issue via the GitHub API
- On success: shows issue number + direct link
- Confirmation email sent to reporter with link to track the issue
- Requires `github_token` and `github_repo` configured in System Settings

---

## 13. Email Notifications

All email sent via SMTP. All emails BCC the `email_bcc` address if configured.

| Trigger | Subject | Content |
|---------|---------|---------|
| Signup | "Verify your email" | Link to set password (24hr expiry) |
| Password reset | "Reset your password" | Link to reset (1hr expiry) |
| Tree invitation | "You've been invited to [Tree]" | Role, acceptance link (7-day expiry) |
| Issue submitted | "Issue #N received — [Title]" | Issue number, GitHub link, page URL |

---

## 14. API Authorization

### 14.1 Bearer Token
Every tree has an `api_token` setting. Requests with `Authorization: Bearer <token>` header are accepted at tree-scoped endpoints at `editor` level, enabling headless scripts and automation.

### 14.2 Route Guard Summary
- All `/api/trees/[treeId]/*` routes: resolve slug or ID → tree record, then check `TreeMember` or ownership
- All queries include `treeId` in WHERE clause (cross-tenant protection)
- `requireTreeAccess(treeIdOrSlug, minRole)` used consistently across all tree-scoped routes

---

## 15. Tree Explorer (Main Public View)

The main view at `/trees/[slug]/` has three sections:

### 15.1 Tree Explorer Component
- Interactive family tree visualization
- Click a person to view their details in a panel
- Navigate through generations (parents, children, spouses)
- Role-aware: editors see edit controls, generate-narrative button, record hints badge
- **Hints panel**: Shows pending record matches for the current person; editors can review/accept/reject
- **Search All Sources button**: Triggers parallel FamilySearch + WikiTree + Geni search for the current person (editor+ only)
- **Search feedback**: Shows "Found N record hints" / "No matches found" / "Search failed" for 5 seconds

### 15.2 People Directory Component
- Searchable list of all people in the tree
- Search by name (live filtering)
- Click to navigate to that person in the explorer

### 15.3 Chat Panel Component
- Floating ✦ button (bottom-right) opens a side panel
- Full conversation history maintained for the session
- Clear button resets conversation
- Enter to send, Shift+Enter for newline
- Status lines show tool progress ("Searching the tree…", "Generating narrative…")
- Clickable person links in responses navigate the explorer and close the chat panel
- When chat agent searches external matches for the currently-viewed person, hints panel auto-refreshes

---

## 16. European Citizenship Eligibility Checker

### 16.1 Overview
Analyzes ancestors' birth places to determine potential citizenship-by-descent eligibility across 22 EU countries: Austria, Bulgaria, Croatia, Cyprus, Czechia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Poland, Portugal, Romania, Slovakia, Slovenia, Spain.

### 16.2 How It Works
- Endpoint: `POST /api/trees/[treeId]/eligibility`
- Scans all Person records in the tree for birth place matches against a country-keyword mapping
- Handles historical region names (e.g., "Austria-Hungary" maps to Austria, Hungary, Czechia, Croatia, Slovenia, Slovakia)
- Each country has 2–3 specific citizenship requirements with a mode: "any" (one must be met) or "all" (all must be met)
- Generation-based rules: "likely" within `maxGeneration`, "possible" up to `possibleGeneration`
- Special handling: Luxembourg male-line-only requirement, language proficiency, religious background

### 16.3 Result Per Country
| Field | Description |
|-------|-------------|
| Country | Name + flag emoji |
| Status | `likely` / `possible` / `insufficient` |
| Matched ancestors | People born in the matching country |
| Matched rule | Primary citizenship requirement text |
| Notes | Explanation of why the match qualifies |

### 16.4 UI
- Dedicated page at `/trees/[slug]/eligibility/`
- Accessible from the tree navigation bar

**Layout:** NOT a 3-column card grid (AI slop trap). Instead: two sections.
- **Top section:** "Likely eligible" countries — full-width horizontal row with country flag, name (Fraunces 20px), matched ancestors as linked names (Instrument Sans 13px), and status pill (forest green "Likely").
- **Middle section:** "Possibly eligible" countries — same row format, amber "Possible" pill.
- **Bottom section:** "Insufficient data" — collapsed accordion, body-sm muted, "Add more birthplace data to unlock" message.

Each country row (not card — no border, no shadow): 56px height on desktop. Hover: parchment-3 bg, no shadow lift.
Country flag: SVG, 24×18px. Country name in Fraunces. Matched ancestor links open PersonSlideOver.

---

## 17. Document Vault (Planned)

- Upload documents (images, PDFs, etc.) associated with a tree and optionally with a specific person
- Fields: title, filename, MIME type, file size, storage key, category, notes, uploaded by
- Organize by category (default: "other")
- View and delete documents
- API: `GET/POST /api/trees/[treeId]/documents`, `GET/DELETE /api/trees/[treeId]/documents/[docId]`
- This feature is a work-in-progress placeholder

---

## 18. Non-Functional Requirements

### 18.1 Multi-Tenancy
- Complete data isolation between trees
- No shared mutable state across trees
- All database queries scoped by `treeId`

### 18.2 Security
- HTTPS required
- Passwords securely hashed
- OAuth secrets stored in database (not committed to source control)
- JWT sessions (not server-side sessions)
- CSRF protection
- Role checks on every API route

### 18.3 Performance
- Streaming AI responses (no waiting for full generation)
- Keepalive heartbeats on streaming endpoints to prevent proxy timeouts
- Pagination on all list endpoints (50 records default)
- External genealogy searches run in parallel

### 18.4 Deployment
- Application server behind a reverse proxy for HTTPS termination
- Database with migration tooling applied on each deploy

---

## 19. Environment Variables

### Required
```
DATABASE_URL=file:/absolute/path/to/dev.db
AUTH_SECRET=<32-byte random base64>
AUTH_URL=https://your-domain.com
EMAIL_SERVER=smtp://user:pass@host:587
EMAIL_FROM=Family History <noreply@your-domain.com>
```

### Optional (also configurable via System Settings UI)
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

All other credentials (Anthropic, FamilySearch, Geni, GitHub) are stored in the `SystemSetting` database table and configured via the admin UI.

---

## 20. Design Specifications

All visual decisions must follow `DESIGN.md` for color tokens, typography, and spacing. This section specifies information hierarchy, interaction states, user journey, and component behavior for each primary screen.

---

### 20.1 Information Hierarchy — Screen by Screen

#### Landing Page (`/`)

**Classifier:** MARKETING/LANDING PAGE

```
VIEWPORT (100vw × 100vh)
├── HERO [full-bleed, parchment gradient #FAF5EC → #F2EBE0]
│   ├── PRIMARY: Product name "Heirloom" — Fraunces 72px, brown-text (#2C1A0E)
│   ├── SECONDARY: Tagline — "Your family's story. Private, beautiful, yours." — Source Serif 4 20px light italic, brown-2
│   ├── TERTIARY: Two CTAs — "Get started" (forest green filled) + "Sign in" (ghost)
│   └── SUPPORTING: Subtle pedigree chart illustration (muted, non-interactive) — far right, 40% opacity
├── FEATURE ROW [parchment-2 bg, 3 columns, NO cards — section typography only]
│   ├── "Build your tree" — Fraunces 24px + Source Serif 4 body
│   ├── "Explore your ancestors" — Fraunces 24px + Source Serif 4 body
│   └── "AI-powered biographies" — Fraunces 24px + Source Serif 4 body
└── FOOTER [forest #2D4A35 bg, cream text] — Privacy | Terms | © Heirloom
```

Hierarchy principle: Brand → value prop → action. Nothing competes with the primary CTA. The pedigree illustration creates visual interest without commanding attention.

**AI Slop rule:** NO icon-in-circle features. NO purple gradients. Text sections separated by whitespace, not dividers or cards.

---

#### Dashboard (`/home`)

**Classifier:** APP UI

```
LAYOUT: Full-width, max 1200px centered, 48px top padding
├── HEADER AREA
│   ├── PRIMARY: "Good morning, [Name]" — Fraunces 36px, brown-text
│   └── ACTION: "New tree" button (forest green) — right-aligned
├── SECTION: "Your Trees" [label style: INSTRUMENT SANS 11px 600, letter-spacing 0.14em, amber underline rule below]
│   └── LEDGER ROWS — not cards. Like entries in a family register.
│       Each row (64px height, border-bottom: border-light, no bg tint, no shadow):
│       ├── LEFT: Tree name — Fraunces 22px, brown-text (col 1, 40% width)
│       ├── CENTER: "N people" — Geist Mono 13px muted + separator · + "N members" (col 2, 25%)
│       ├── RIGHT-CENTER: "Updated X days ago" — body-sm muted (col 3, 25%)
│       └── FAR-RIGHT: "→" chevron — brown-muted, 16px (col 4, 10%)
│       Hover row: parchment-2 bg, instant (no transition). Cursor: pointer.
│       Click entire row to enter tree.
├── SECTION: "Shared With You" [same label style — only shown if member of other trees]
│   └── Same card format, WITH role badge: VIEWER / EDITOR / ADMIN — amber label
└── EMPTY STATE [if no trees]: See §20.3
```

Hierarchy principle: Greeting establishes context. "New tree" is right-aligned (not in face). Tree names are the primary focal point per card — date and count are tertiary.

---

#### Tree Explorer (`/trees/[slug]/`)

**Classifier:** APP UI (data-dense, task-focused)

```
LAYOUT: Full-viewport, no scroll
├── TOP BAR [48px height, parchment-2 bg, border-bottom]
│   ├── LEFT: Tree name (Instrument Sans 15px 600) + TreeSwitcher dropdown
│   ├── CENTER: View tabs — Directory | Pedigree | Fan Chart (Instrument Sans 13px)
│   └── RIGHT: Chat button (✦, 36px, forest green) + User menu
├── MAIN CONTENT [100vh - 48px]
│   ├── PEDIGREE VIEW (when active):
│   │   ├── PRIMARY: SVG chart canvas — 100% of main content area
│   │   ├── OVERLAY TOP-LEFT: PersonPicker (subtle ghost input, 220px wide)
│   │   ├── OVERLAY RIGHT: GenerationControls (−/+ buttons, 40px each, stacked)
│   │   ├── OVERLAY BOTTOM-RIGHT: Minimap (120px × 80px, shows at 4+ gens)
│   │   └── SLIDE-OVER: PersonSlideOver (340px, slides in from right on node click)
│   ├── FAN CHART VIEW (when active):
│   │   └── Same overlay structure as Pedigree
│   └── DIRECTORY VIEW (when active):
│       ├── TOP: Search input (full-width minus 32px padding)
│       └── BELOW: Person rows — name (Fraunces 17px) + dates (Geist Mono 13px)
└── CHAT PANEL [360px slide-in from right, layered above main content]
```

Hierarchy principle: The chart is the hero. Controls are overlaid softly — they disappear into the canvas when not focused. The person detail panel never competes with the chart itself.

---

#### Person Detail (SlideOver Panel)

```
SLIDE-OVER: 340px wide, slides from right, full-height, parchment-2 bg
├── TOP SECTION
│   ├── PRIMARY: Person name — Fraunces 28px, brown-text
│   ├── SECONDARY: Dates — Fraunces 16px italic, brown-muted (e.g. "1842 – 1914")
│   └── TERTIARY: Birth + death place — Instrument Sans 13px, brown-muted
├── FAMILY SECTION
│   ├── Parents (if known) — linked names
│   ├── Spouses (if known) — linked names + marriage date
│   └── Children (if known) — linked names
├── NARRATIVE SECTION [if exists]
│   └── Source Serif 4 16px, 1.8 line-height, max 65ch, brown-text
├── EDITOR CONTROLS [only for editor+ role]
│   ├── "Edit person" button (ghost, forest border)
│   ├── "Generate narrative" button (ghost, forest border) OR "Regenerate" if exists
│   └── Record hints badge (if pending matches) → opens hints panel
└── FOOTER: Audit info — "Last updated X" in body-sm muted
```

---

#### Admin Shell (`/trees/[slug]/admin/*`)

```
LAYOUT: Two-column
├── SIDEBAR: 220px, forest green bg (#2D4A35), white text
│   ├── Back link: "← [Tree Name]" (Instrument Sans 13px, amber-light)
│   └── NAV LINKS: People · Families · Members · Settings · Import · FamilySearch · Geni
└── MAIN: 12-col grid, max 960px, parchment bg, 32px padding
    ├── PAGE HEADER: Fraunces 28px brown-text
    ├── ACTION BAR: Primary action button right-aligned (forest green)
    ├── CONTENT: List or form (see §20.2 for states)
    └── PAGINATION: Instrument Sans 13px, centered, prev/next + page count
```

Edit forms: slide-in panel (400px right), never full-page or modal.
Destructive actions: inline confirmation beneath the button — red text "Are you sure? This cannot be undone." + Cancel (gray ghost) + Delete (solid red). Never a modal.

---

### 20.2 Interaction State Coverage

| Feature | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Pedigree chart | Skeleton: 3 placeholder nodes with amber shimmer | See §20.3 (empty tree) | "Couldn't load ancestors. Retry →" inline below chart | Chart renders with nodes | — |
| Fan chart | Same as pedigree | Same | Same | Chart renders arcs | — |
| Person picker search | Spinner inside input (16px) | "No people found. Add someone →" | "Search failed. Try again." | Dropdown shows names | — |
| Directory search | Instant (client-side filter) | "No matches for '[query]'" | — | Filtered list | — |
| AI narrative generation | Stream begins: skeleton 5-line placeholder → text appears line-by-line, 80ms per line | — | "Generation failed: [reason]. Try again." with Retry button | "Saved" checkmark fades in at narrative bottom, 2s | Stream partial (navigating away: cancel button shows, stream aborts, nothing saved) |
| Record hint search | 3-source status row: "Searching FamilySearch… WikiTree… Geni…" with per-source spinners | "No matches found in any source." | Per-source failure: "FamilySearch: failed · WikiTree: 3 matches · Geni: failed" | "Found N record hints" badge appears | One source fails: show partial results with failure badge on failed source |
| Record match review (accept) | Save spinner on Accept button | — | "Import failed. Please try again." | "Fields imported. Person updated." toast (3s) | — |
| Chat message | Animated dots (✦ ✦ ✦, cycling) + tool progress lines ("Searching the tree…") | — | "Couldn't send message. Check connection." with Retry | Response renders as HTML | Tool errors: "One tool failed, but here's what I found…" |
| Dashboard tree list | Skeleton cards (3 placeholder cards, shimmer) | See §20.3 | "Couldn't load your trees. Retry →" | Trees render | — |
| EU eligibility checker | "Analyzing your tree…" + animated Fraunces counter | "No ancestors matched any EU country. Add more birthplace data to improve results." | "Analysis failed. Try again." | Country cards render by likelihood | — |
| Member invite | Spinner on Invite button | — | "Email already invited" or "User already a member" inline below field | "Invitation sent to [email]" inline confirmation | — |
| Issue report submission | Spinner on Submit | — | "Couldn't submit. Try again or email us at [email]." | "Issue #N filed. [View on GitHub →]" | — |
| Password reset email | Spinner | — | "No account with that email." | "Check your inbox for a reset link." | — |

**Loading skeleton spec:** Amber shimmer (`--amber-light` at 30% → 60% oscillating) on parchment-2 background. Animation: 1.5s ease-in-out loop.

**Error state spec:** Inline below the failing component (never a modal unless it's blocking the whole page). Red text (`#8B2020`), Instrument Sans 13px. Always include a Retry action or alternative next step.

---

### 20.3 Empty State Catalog

Every empty state has: warmth, a primary action, and context. Never just "No items found."

| Screen | Empty State | Icon/Illustration | Primary Action |
|--------|-------------|-------------------|----------------|
| Dashboard — no trees | "Your family story starts here." (Fraunces 28px) + "Create your first tree to get started." (Source Serif 4 16px body) | Subtle tree branch illustration (SVG, amber tones, 120px) — centered above text, not in a card | "Create your first tree" (forest green button, 48px height, centered) |
| Dashboard — no shared trees | Section simply hidden (don't show "Shared With You" header with empty content) | — | — |
| Pedigree chart — empty tree | "Add a person to get started." centered in canvas area, with dashed border node placeholder | Dashed circle node (amber border, 80px) | "Add [root person]" inside the placeholder node (forest green text) |
| Person directory — empty tree | "No people in this tree yet." | — | "Add person →" link |
| Hints panel — no hints | "No record hints yet." (body-sm muted) + "Search external records to find matches." | — | "Search all sources" button (if editor) |
| Hints panel — all reviewed | "All caught up! No pending hints." (Source Serif 4 italic, warm tone) | Small checkmark in amber | — |
| AI narrative — not generated | Placeholder block with dashed border: "No biography yet." (brown-muted italic) + if editor: "Generate one with AI →" | — | "Generate narrative" (forest green, if editor) |
| Admin people list — empty | "No people in this tree yet. Import a GEDCOM file or add people manually." | — | "Import GEDCOM" + "Add person" |
| Admin members list | Always shows at least the owner; no true empty state | — | — |
| EU eligibility — no matches | "No EU eligibility matches found. Add birthplace information to more ancestors to improve results." | Globe SVG, muted amber | "Go to tree →" |
| Chat — new conversation | "Ask me anything about your family tree." (Fraunces 18px italic, brown-muted) + example prompts as ghost buttons | ✦ subtle watermark | Example: "Who is the oldest person?" "Trace my paternal line" |

---

### 20.4 Component Behavior Specifications

#### PersonPicker
- Anchor: top-left of chart canvas, 16px inset from edges
- Width: 220px, height: 36px
- Appearance: ghost input with forest green border on focus, placeholder "Find a person…" (brown-muted)
- Interaction: type-ahead, debounced 250ms. Results appear as a dropdown (max 6 results, 48px per row)
- Result row: name (Fraunces 15px) + birth year (Geist Mono 13px, muted) + sex indicator
- On select: chart re-roots instantly (no animation — feel of snapping to a new photo). Person picker shows selected name.
- Escape: clears selection back to previous root
- Keyboard: arrow keys navigate results, Enter selects

#### GenerationControls
- Position: overlay, right edge of chart canvas, vertically centered
- Design: two pill buttons (−/+), 40px × 40px, parchment-2 bg, forest border, Instrument Sans 18px
- Depth label between buttons: "4 gen" (Geist Mono 11px, brown-muted)
- Min depth: 1. Max depth: 6. Buttons disabled at limits (reduced opacity, no pointer).
- On change: chart transitions — new nodes fade in at 200ms, removed nodes fade out at 150ms

#### Narrative Streaming
- Location: within PersonSlideOver panel, below family section
- During stream: show skeleton (5 placeholder lines, amber shimmer), then text fades in line-by-line as chunks arrive
- Stream chunk rendering: accumulate into `<div>` with `innerHTML`, apply Source Serif 4 narrative styling
- Cancel button: visible during stream, ghost style, red text. Clicking cancels fetch, discards partial text.
- Completion: "Saved" badge (amber, Instrument Sans 11px, letter-spacing 0.12em) fades in for 2s at bottom-right of narrative block
- Navigation during stream: clicking another person node cancels the current stream automatically

#### Record Match Diff Panel
- Trigger: clicking "Review" on a match card
- Container: slide-in panel from right, 480px wide, full-height, parchment bg
- Header: match name (Fraunces 20px) + source badge + confidence score + "Score: 82/100"
- Table: 4 columns — Field | Tree Value | External Value | Import?
  - Column widths: 20% | 35% | 35% | 10%
  - Row height: 44px
  - Sorted: vitals (birth, death) first, then place, occupation, notes
  - Pre-checked: fields where external value differs AND score > 70
  - Tree value missing: show "—" in brown-muted italic
  - External value missing: show "—" in brown-muted italic
- Accept button (forest green, full-width) at panel bottom. Cancel button (ghost) above.
- On accept: panel slides away, hints badge count decrements

#### Chat Panel
- Trigger: ✦ button (bottom-right of tree explorer, 48px diameter, forest green bg, white ✦)
- Width: 360px. Height: full viewport minus top bar.
- Animation: slides in from right, 200ms ease-out
- Input: bottom of panel, Instrument Sans 15px, multiline (Shift+Enter = newline, Enter = send)
- Status lines: Instrument Sans 13px, brown-muted italic, appear above response during tool use
- Person links: underlined, forest green color, cursor pointer. Click: closes panel, re-roots chart.
- Clear button: top-right of panel, "Clear" Instrument Sans 12px ghost
- Empty state: see §20.3

#### Invitation Acceptance (`/invite/[token]`)
- Layout: full-page, centered card (parchment-2 bg, 480px max-width, 40px padding)
- Card header: "You've been invited to [Tree Name]" — Fraunces 28px, brown-text
- Subhead: "As [Role]" — body, brown-muted
- If logged in: two buttons — "Accept invitation" (forest green, full-width) + "Decline" (ghost, below)
- If logged out: inline signup form (name, email, password) + "Create account and join" button
- Post-accept: redirect to `/trees/[slug]/` with a success toast: "Welcome to [Tree Name]!"
- Expired token: "This invitation has expired." + "Ask your tree admin to send a new invite."
- Already member: "You're already a member of [Tree Name]." + "Go to tree →" button

#### Error Message Tone

| Situation | Message |
|-----------|---------|
| AI API key missing | "Narrative generation isn't configured. Ask your tree admin to add an Anthropic API key in tree settings." |
| AI quota exceeded | "We've hit the narrative limit. Try again tomorrow, or ask your tree admin to check the API quota." |
| FamilySearch not connected | "Connect your FamilySearch account to search this source. → Connect in settings" |
| Geni not connected | "Connect your Geni account to search this source. → Connect in settings" |
| Record import failed | "Couldn't import those fields. The external record may have changed. Try reviewing again." |
| Generic network error | "Something went wrong. Check your connection and try again." |
| 403 — insufficient role | "You need editor access to do that. Ask your tree admin." |
| Expired session | "Your session expired. Sign in again to continue." |

#### Role-Based Visibility
- **Viewer**: edit/generate buttons are hidden entirely (not grayed out). A lock icon (🔒 equivalent SVG, 14px, brown-muted) appears at the top of the narrative block: "Read-only — contact the tree admin to get editor access." Shown once per session.
- **Editor**: all buttons visible. Hints badge visible on nodes with pending matches.
- **Admin**: same as editor, plus admin nav link in top bar.

---

### 20.5 Responsive Specifications

| Breakpoint | Viewport | Key Changes |
|------------|----------|-------------|
| `sm` | < 640px | Pedigree/fan chart: horizontal scroll canvas, touch pinch-zoom. GenerationControls move to bottom sticky bar (full-width row). PersonPicker becomes modal (full-screen overlay, 90vh). PersonSlideOver becomes full-screen overlay. Chat panel: full-width overlay. Top bar collapses tree name to icon. |
| `md` | 640–1024px | Dashboard: 2-column tree card grid. Admin sidebar collapses to icon-only (48px) with tooltips. PersonSlideOver: 300px. |
| `lg` | 1024–1440px | Full layout as specified above. |
| `xl` | > 1440px | Max content width: 1400px centered. Chart canvas scales to fill extra space. |

**Mobile-specific chart behavior:**
- Touch events: two-finger pinch = zoom, one-finger drag = pan
- Tap a node: opens PersonSlideOver as full-screen bottom sheet (slides up from bottom)
- GenerationControls sticky bar: 56px height, forest bg, two buttons centered (−/+) with depth label between

---

### 20.6 Motion & Animation

| Element | Animation | Timing |
|---------|-----------|--------|
| Page transitions | Fade in (opacity 0→1) | 150ms ease |
| Slide-over panels (PersonSlideOver, admin edit panel, chat panel, record review panel) | Slide from right (translateX 100% → 0) | 200ms ease-out |
| Pedigree re-root (new person selected) | Instant snap — no animation. Fast = intentional. | 0ms |
| New generation nodes appearing | Fade in at position (opacity 0→1) | 200ms ease |
| Removed generation nodes | Fade out (opacity 1→0) | 150ms ease |
| Loading skeletons | Shimmer sweep (amber-light 30%→60%, left to right) | 1.5s ease-in-out, infinite |
| Toast notifications | Slide up from bottom, auto-dismiss | In: 200ms ease-out. Hold: 3s. Out: 150ms ease-in |
| "Saved" narrative badge | Fade in, hold 2s, fade out | 200ms / 2000ms / 200ms |
| Chat status lines | Fade in | 150ms ease |
| Empty state illustrations | Subtle float (translateY 0→-6px→0) | 3s ease-in-out, infinite |

**Motion rule:** Only the chart canvas uses zero-ms transitions (snap feel). Everything else gets 150–200ms. No transitions above 300ms — this is an archive, not an animation studio.

---

### 20.7 Accessibility Requirements

**Contrast ratios (WCAG AA minimum):**
- Body text on parchment: brown-text (#2C1A0E) on #FAF5EC = 12.8:1 ✅
- Muted text on parchment: brown-muted (#7A6653) on #FAF5EC = 4.6:1 ✅
- Forest green button text (white on #2D4A35): 9.1:1 ✅
- Amber badges: amber (#C9974A) on parchment-2 — amber used decoratively only, never as text on light bg at small sizes

**Keyboard navigation:**
- All interactive elements reachable by Tab. Order: top bar → main content → overlays → footer.
- PersonPicker: arrow keys navigate results, Enter selects, Escape closes
- Chart nodes: Tab navigates between nodes in DOM order. Enter opens PersonSlideOver for focused node.
- Slide-over panels: focus traps when open. Escape closes and returns focus to trigger.
- Chat panel: Tab navigates within panel only when open (focus trapped). Escape closes.
- GenerationControls: focusable buttons with labels `aria-label="Increase generations"` / `aria-label="Decrease generations"`
- Disabled buttons: `aria-disabled="true"` + `tabindex="-1"`

**Screen reader support:**
- Chart nodes: `role="button"` + `aria-label="[Name], born [year], [N] generations from root"`
- Person links in chat: `aria-label="View [Name] in family tree"`
- Status/progress text: `role="status"` `aria-live="polite"` on narrative stream container and record search feedback
- Error messages: `role="alert"` `aria-live="assertive"`
- Loading skeletons: `aria-busy="true"` on parent container, `aria-label="Loading…"`
- Slide-over panels: `role="dialog"` + `aria-labelledby` pointing to panel heading + `aria-modal="true"`
- Tab indicator (Directory | Pedigree | Fan Chart): `role="tablist"` + `role="tab"` + `aria-selected`

**Touch targets:** All interactive elements minimum 44×44px. GenerationControls: 40px — add 4px invisible padding via `padding` to meet 44px minimum.

**Reduced motion:** Wrap all CSS transitions/animations in `@media (prefers-reduced-motion: no-preference)`. When reduced motion is preferred: remove skeleton shimmer, remove slide animations (show instantly), remove float animation on empty state illustrations.

**Color independence:** No information conveyed by color alone. Record match source badges (FamilySearch=green, WikiTree=blue, Geni=purple) always include the source name as text. Role badges always include role text. Status pills (Likely/Possible/Insufficient) always include the status word.

---

## 21. Static Pages

### `/privacy`
Must document:
- Data collected (email, name, genealogy records, OAuth tokens)
- Third-party services (FamilySearch, Geni, WikiTree, Google, Anthropic, GitHub)
- Data retention and deletion
- No data sold to third parties

### `/tos`
Must cover:
- Acceptable use (private family history, no commercial scraping)
- Living persons privacy (care with data about living individuals)
- Account termination
- Disclaimer of warranties

Both pages should be updated whenever features, data flows, or third-party integrations change.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 6 proposals, 4 accepted, 2 deferred; 2 critical gaps |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 8 issues, 0 critical gaps; TODO-4 pulled into scope |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (FULL) | score: 4/10 → 9/10, 15 decisions |

**UNRESOLVED:** 0 decisions.
**VERDICT:** CEO + ENG + Design CLEARED — ready to implement.
