# User Requirements Document
## Family History Platform

**Version:** 1.0
**Date:** March 2026
**Purpose:** Specification document for recreating the Family History platform from scratch.

---

## 1. Overview

A **multi-tenant private family history web application**. Multiple families can each own a private genealogy tree. Each tree has its own members, data, and settings. Users are invited to trees by tree administrators; the platform is not publicly open for self-registration (accounts require admin approval).

### Core Capabilities
- Interactive family tree explorer
- Searchable people directory
- AI-generated biographical narratives
- Conversational AI assistant for querying the tree
- External record matching (FamilySearch, WikiTree, Geni)
- GEDCOM import and export
- Role-based access control at both platform and tree level

### Technology Stack
- **Framework:** Next.js 15 (App Router, server components + client components)
- **Database:** SQLite via Prisma ORM
- **Auth:** Auth.js v5 (NextAuth beta) — JWT sessions, Prisma adapter
- **AI:** Anthropic Claude API (streaming narratives + agentic chat)
- **Email:** Nodemailer (SMTP)
- **Deployment:** Node.js server behind nginx reverse proxy (PM2 process manager)

---

## 2. URL Structure

```
/                         Platform landing page
/home                     Authenticated dashboard (tree list)
/login                    Sign in (email/password or Google)
/signup                   Request access
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
- **Email + password** — bcrypt-hashed passwords, custom credentials provider
- **Google OAuth** — sign in with Google account

### 3.2 Account Creation Flow
1. User submits email at `/signup`
2. System sends email verification link
3. User clicks link → `/set-password` → creates password
4. Account created with **pending** role (requires admin approval)
5. Platform admin reviews at `/admin/users` and promotes role

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
| id | CUID | Primary key |
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
| id | CUID | Primary key |
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
| id | CUID | |
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
| id | CUID | |
| treeId | string | FK to Tree |
| personIdsKey | string | Comma-separated person IDs defining the lineage line |
| html | string | Generated narrative story |

Unique constraint: `(treeId, personIdsKey)`.

### 5.5 AuditLog
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | |
| treeId | string | FK to Tree |
| userId | string | FK to User |
| tableName | string | e.g. `people` |
| recordId | string | |
| action | string | `create` / `update` / `delete` / `generate-narrative` |
| oldData | string? | JSON |
| newData | string? | JSON |

### 5.6 User (Auth.js standard)
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | |
| email | string | Unique |
| emailVerified | DateTime? | |
| name | string? | |
| image | string? | |
| role | string | `pending` (default) / `viewer` / `editor` / `admin` |
| password | string? | bcrypt hash; null for OAuth users |
| tokenVersion | int | For force-logout all sessions |

### 5.7 OAuth Token Models
**FamilySearchToken** and **GeniToken** — one per user, store `accessToken`, `refreshToken`, `expiresAt`, `displayName`, and provider-specific user ID. Auto-refresh on use.

### 5.8 TreeInvite
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | |
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

All email sent via Nodemailer (SMTP). All emails BCC the `email_bcc` address if configured.

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
- All `/api/trees/[treeId]/*` routes: resolve slug or CUID → tree record, then check `TreeMember` or ownership
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

## 16. Non-Functional Requirements

### 16.1 Multi-Tenancy
- Complete data isolation between trees
- No shared mutable state across trees
- All database queries scoped by `treeId`

### 16.2 Security
- HTTPS required (TLS cert via Let's Encrypt / Cloudflare DNS challenge for wildcard)
- Passwords hashed with bcrypt
- OAuth secrets stored in database (not committed to source control)
- JWT sessions (not server-side sessions)
- CSRF protection via Auth.js
- Role checks on every API route

### 16.3 Performance
- Streaming AI responses (no waiting for full generation)
- 5-second keepalive on streaming endpoints to prevent proxy timeouts
- Pagination on all list endpoints (50 records default)
- External genealogy searches run in parallel (`Promise.allSettled`)

### 16.4 Deployment
- Node.js server, managed by PM2
- nginx reverse proxy for HTTPS termination and HTTP→HTTPS redirect
- SQLite database (single-file, absolute path in env var)
- Database migrations via `prisma migrate deploy` on each deploy
- GitHub Actions workflow triggers Claude Code on new issues to auto-fix and open PRs

---

## 17. Environment Variables

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

## 18. Static Pages

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
