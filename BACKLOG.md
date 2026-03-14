# Heirloom — MVP Backlog
_Last updated: 2026-03-14. Maintained by AI assistant across sessions._

---

## What's Already Done ✅

After a full code review the following are complete and production-quality:

- **Auth** — signup (email verification flow), login (credentials + Google OAuth), forgot-password, set-password, session handling via Auth.js v5 JWT, middleware route protection
- **Prisma schema** — full multi-tenant schema: User, Tree, TreeMember, TreeInvite, Person, Family, FamilyChild, FamilySearchMatch, Setting, SystemSetting, LineageStory, AuditLog, FamilySearchToken, GeniToken
- **Tree CRUD** — create, list, slug routing, member management, settings
- **People & Families CRUD** — full create/read/update/delete with cross-tenant guard
- **GEDCOM import/export** — upload .ged, parse, create/update people + families
- **AI Narratives** — streaming + non-streaming, parameterized prompts, audit logging, per-tree model/key override
- **AI Lineage Stories** — generate + cache story for a lineage line
- **AI Chat** — full conversational assistant with tool use (search_people, get_person, generate_narrative, search_external_matches, etc.)
- **Eligibility engine** — full EU citizenship rules engine (22 countries), BFS ancestor traversal, likely/possible/insufficient status, map + detail UI
- **External record matching** — FamilySearch, WikiTree, Geni parallel search, review/accept/reject workflow
- **FamilySearch OAuth + import** — ancestor import up to N generations
- **Geni OAuth** — connect + search
- **Invitations** — invite by email, accept via token, role assignment
- **Admin panel** — user management, role promotion, system settings UI
- **Issue reporting** — floating button → GitHub issue via API
- **UI design system** — Heirloom tokens, parchment/rust palette, responsive layouts
- **Middleware** — route protection for /home, /trees/*, /invite/*, /admin/* with role-based redirects
- **Deployment scripts** — deploy.sh, server-setup.sh, PM2, nginx reverse proxy
- **Vercel config** — vercel.json present

---

## What's Remaining 🔧

### HIGH PRIORITY

#### 1. Document Vault
**Status:** Not started — no API routes, no Prisma model, no UI

The USER_REQUIREMENTS.md does not fully spec this yet, but it's a core Heirloom feature: users need to upload and track citizenship application documents (birth certificates, naturalisation records, etc.) tied to a tree.

**What to build:**
- Prisma model: `Document` (id, treeId, personId?, title, filename, mimeType, size, storageKey, category, notes, createdAt, updatedAt)
- API routes:
  - `GET  /api/trees/[treeId]/documents` — list documents
  - `POST /api/trees/[treeId]/documents` — upload (multipart)
  - `GET  /api/trees/[treeId]/documents/[docId]` — download
  - `DELETE /api/trees/[treeId]/documents/[docId]` — delete
- Storage abstraction: `src/lib/storage.ts` — local filesystem in dev, pluggable for S3/Cloudflare R2 later
- UI: `/trees/[slug]/documents` page — upload, list, download, delete
- Nav link: add "Documents" tab to tree nav

**Acceptance criteria:**
- [ ] Document model in schema.prisma with migration
- [ ] API routes with `requireTreeAccess` guard (viewer=read, editor=write)
- [ ] Storage abstraction with local driver
- [ ] Upload form accepts PDF, JPG, PNG up to 20MB
- [ ] List view shows filename, category, date, person link
- [ ] Download serves file with correct Content-Type
- [ ] Audit log entry on upload/delete

**Files to create/modify:**
- `prisma/schema.prisma` — add Document model
- `src/lib/storage.ts` — new
- `src/app/api/trees/[treeId]/documents/route.ts` — new
- `src/app/api/trees/[treeId]/documents/[docId]/route.ts` — new
- `src/app/trees/[slug]/documents/page.tsx` — new
- `src/app/trees/[slug]/page.tsx` — add Documents nav link

---

#### 2. CitizenshipChecklist integration
**Status:** Separate repo (`CitizenshipChecklist`) — not merged

This is a checklist/tracker for the actual citizenship application process (docs needed, steps completed, etc.) tied to a country + tree.

**What to build:**
- Prisma model: `CitizenshipApplication` (id, treeId, country, status, notes, createdAt, updatedAt) + `ChecklistItem` (id, applicationId, step, done, dueDate, notes)
- API routes under `/api/trees/[treeId]/citizenship`
- UI: `/trees/[slug]/citizenship` page — country selector, checklist, progress tracker
- Wire eligibility results → "Start Application" CTA that creates a CitizenshipApplication record

**Acceptance criteria:**
- [ ] Models in schema + migration
- [ ] Can create application for a country from the eligibility page
- [ ] Checklist items per country (hardcoded initially, later configurable)
- [ ] Progress % shown on eligibility card

**Files to create/modify:**
- `prisma/schema.prisma` — add CitizenshipApplication, ChecklistItem models
- `src/app/api/trees/[treeId]/citizenship/route.ts` — new
- `src/app/trees/[slug]/citizenship/page.tsx` — new
- `src/app/trees/[slug]/eligibility/EligibilityClient.tsx` — add "Start Application" CTA

---

#### 3. TreeExplorer visual polish pass
**Status:** Functionally complete, wireframe alignment incomplete

The wireframes specify a sidebar + person detail panel layout with Heirloom design tokens. Explorer is functionally correct but visual QA against wireframes is pending.

**What to do:**
- Side-by-side review of explorer vs wireframes (`~/ProjectHome/heirloom-wireframes`)
- Tighten: person sidebar card layout, citizenship mode overlay, crumb node spacing, connection card styles
- Ensure mobile/narrow viewport doesn't break layout

**Acceptance criteria:**
- [ ] Explorer sidebar matches wireframe person card design
- [ ] Citizenship mode overlay renders correctly on eligible ancestors
- [ ] No horizontal overflow on narrow viewports (< 768px)

**Files to modify:**
- `src/components/public/TreeExplorer.tsx`
- `src/app/globals.css`

---

### MEDIUM PRIORITY

#### 4. Seed script for development
**Status:** No seed script — dev DB has real data but no reproducible seed

**What to build:**
- `prisma/seed.ts` — creates: 1 admin user, 1 tree "Gaasch Family", ~5 sample people with Luxembourg/Germany birthplaces (to exercise eligibility), 2 families
- Add to package.json: `"db:seed": "dotenv -e .env.local -- tsx prisma/seed.ts"`

**Acceptance criteria:**
- [ ] `npm run db:seed` runs without errors on a fresh DB
- [ ] Seeded tree appears in dashboard
- [ ] Eligibility page shows at least 1 "Likely" result for Luxembourg

**Files to create/modify:**
- `prisma/seed.ts` — new
- `package.json` — update db:seed script

---

#### 5. Dashboard page
**Status:** `/dashboard` route exists but content unknown — needs review

Check if `/dashboard/page.tsx` is implemented or stub. Should show:
- All trees the user owns or is a member of
- Quick links to recent activity
- Citizenship eligibility summary

**Files to review/modify:**
- `src/app/dashboard/page.tsx`

---

#### 6. README + local dev guide
**Status:** No README.md — SETUP.md exists but may be stale

**What to write:**
- Prerequisites (Node 22, SQLite)
- Clone + install
- `.env.local` setup (copy from `.env.local.example`)
- DB setup: `npm run db:migrate` + `npm run db:seed`
- Run dev server: `npm run dev`
- Key URLs and how to get to each feature
- Deployment notes (PM2 + nginx)

**Files to create/modify:**
- `README.md` — new (or rewrite if exists)

---

### LOW PRIORITY / FUTURE

#### 7. Test suite
**Status:** No tests — no test runner configured

Add at minimum:
- Jest or Vitest setup
- Unit tests for `src/lib/eligibility.ts` (checkEligibility edge cases)
- Unit tests for `src/lib/narrative.ts` (buildNarrativePrompt)
- Integration test for eligibility API route

---

#### 8. Accessibility pass
- aria-labels on interactive elements in TreeExplorer, ChatPanel
- Keyboard navigation in explorer
- Color contrast check for parchment palette

---

#### 9. Rate limiting on AI endpoints
- Add per-user/per-tree rate limiting on narrative generation and chat
- Prevent runaway Claude API costs

---

## Sprint Plan (next 2 weeks)

| Week | Items |
|------|-------|
| Week 1 | Document Vault (schema + API + UI) |
| Week 1 | Seed script |
| Week 2 | CitizenshipChecklist integration |
| Week 2 | Explorer visual polish pass |
| Week 2 | README + local dev guide |
| Ongoing | Test suite (start with eligibility unit tests) |

---

## How to use this file

- I (AI assistant) update this after each session
- Completed items move to the "Already Done" section with ✅
- New findings are added as they're discovered
- The "What's Remaining" section is always the source of truth for what to work on next
