# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js 15 multi-tenant private family history platform. Multiple families can each own a private genealogy tree — with an interactive explorer, searchable people directory, and AI-generated biographical narratives. Users are invited to trees by tree admins.

## Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

npm run db:migrate       # Run Prisma migrations against .env.local (creates/updates prisma/dev.db)
npm run db:seed          # Import JSON data from ../gaasch-family/src/data/ into SQLite
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Push schema to DB without migration (dev only)
```

All `db:*` scripts use `dotenv -e .env.local` to inject `DATABASE_URL`.

After any `prisma/schema.prisma` change, run `npm run db:migrate` (creates a migration) then `npm run db:generate` (regenerates the client).

### Migration notes (multi-tenant transition)

The repo contains two schema files during the migration period:
- `prisma/schema.prisma` — intermediate: adds Tree/TreeMember/TreeInvite models + nullable `treeId`/`gedcomId` on Person/Family/Setting
- `prisma/schema.final.prisma` — final: CUID PKs, NOT NULL `treeId`, composite unique keys

Migration workflow:
1. `npm run db:migrate` — apply intermediate schema (Migration 1)
2. `dotenv -e .env.local -- tsx scripts/migrate-to-multi-tenant.ts` — one-time data migration
3. Replace `schema.prisma` with `schema.final.prisma` content, then `npm run db:migrate` again (Migration 2)

## Architecture

### URL Structure
```
/                        Generic platform landing; authenticated → /dashboard
/dashboard               Authenticated: list owned + member trees
/trees/new               Create a new tree
/trees/[slug]/           Tree view (explorer + directory); requires login + membership
/trees/[slug]/admin/     Tree admin shell (sidebar layout)
/invite/[token]          Accept a tree invitation
/login, /signup          Auth pages
```

`/admin` → 301 redirects to `/dashboard` (legacy bookmark support).

### Auth split (Edge + Node)
Auth.js v5 (NextAuth beta) uses **two config files** to satisfy Next.js Edge Runtime constraints:
- `src/auth.config.ts` — Edge-safe config (JWT strategy, callbacks, pages). Used by `middleware.ts`.
- `src/auth.ts` — Full Node.js config, adds the Prisma adapter and Credentials provider (bcrypt). Used by API routes and server components.

Session tokens are JWTs (30-minute expiry). The `role` and `id` fields are embedded in the token via JWT/session callbacks.

### Authorization
`src/lib/auth.ts` exports four helpers:
- `requireRole(minRole)` — platform-level (create trees, approve users). Returns `{ userId, email, role }` or `NextResponse` 401/403.
- `requireRoleOrToken(req, minRole)` — same, plus `Authorization: Bearer` fallback against any tree's `api_token` setting.
- `requireTreeAccess(treeIdOrSlug, minRole)` — tree-scoped; checks owner or TreeMember row. Returns `{ userId, email, treeRole, tree }` or `NextResponse`.
- `requireTreeAccessOrToken(req, treeIdOrSlug, minRole)` — same, plus Bearer token checked against the tree's `api_token` setting.

Role hierarchies:
- Platform: `pending (-1) < viewer (0) < editor (1) < admin (2)`
- Tree: `viewer (0) < editor (1) < admin (2)`

Middleware (`src/middleware.ts`) redirects unauthenticated users away from `/dashboard`, `/trees/*`, `/invite/*`, and redirects `pending` users to `/awaiting-approval`.

### Database
SQLite via Prisma. Key models:
- `Tree` — each tree has a slug, name, ownerId
- `TreeMember` — `(treeId, userId)` unique; role is viewer/editor/admin
- `TreeInvite` — email invitation with expiry and accept token
- `Person` — genealogy records scoped to a tree; `gedcomId` stores original GEDCOM identifier
- `Family` — links husband/wife Person rows; `FamilyChild` is the join table for children
- `User` / `Account` / `Session` / `VerificationToken` — Auth.js standard tables
- `Setting` — key/value store scoped to a tree (holds `anthropic_api_key`, `anthropic_model`, `api_token`)
- `AuditLog` — records create/update/delete/generate-narrative actions with old/new JSON, scoped to a tree

Singleton Prisma client is at `src/lib/prisma.ts`.

### API routes
All tree-scoped routes live under `/api/trees/[treeId]/` and resolve the slug/id via:
```ts
const tree = await prisma.tree.findFirst({ where: { OR: [{ id: treeId }, { slug: treeId }] } });
const auth = await requireTreeAccess(treeId, 'viewer');
if (auth instanceof NextResponse) return auth;
```

Cross-tenant guard: always include `treeId: tree.id` as the first `where` condition on person/family lookups.

Platform-level routes (`/api/trees`, `/api/users`) use `requireRole`.

Old routes (`/api/people`, `/api/families`, `/api/settings`, `/api/export`, `/api/import`) have been deleted.

### AI narrative generation
`POST /api/trees/[treeId]/people/[id]/generate-narrative` — requires `editor` tree role or Bearer token. Reads `anthropic_api_key` and `anthropic_model` from the tree's `Setting` rows. Streams Claude's response as `text/plain`, accumulates full HTML, saves to `Person.narrative`, writes audit log.

### generate-narratives script
```bash
node scripts/generate-narratives.mjs \
  --tree gaasch-family \
  --token <api_token_from_settings> \
  --ids <cuid1,cuid2,...> \
  [--url https://family.example.com] \
  [--model claude-haiku-4-5-20251001] \
  [--concurrency 5]
```

### Tree view page
`src/app/trees/[slug]/page.tsx` — server component. Verifies session + tree membership, then renders `<PublicTreeExplorer treeSlug={slug} role={treeRole} />` and `<PublicDirectorySection treeSlug={slug} />`.

## Environment Variables

Required in `.env.local`:
| Variable | Notes |
|---|---|
| `DATABASE_URL` | `file:./prisma/dev.db` locally |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` locally |
| `EMAIL_SERVER` | SMTP string (use Ethereal for local dev) |
| `EMAIL_FROM` | Display name + address |

The Anthropic API key is stored in the DB (`Setting` table), not in `.env`.

## First-time setup

1. `npm install`
2. `cp .env.local.example .env.local` and fill in values
3. `npm run db:migrate`
4. `dotenv -e .env.local -- tsx scripts/migrate-to-multi-tenant.ts` (if migrating from single-tree data)
5. `npm run dev`
6. Sign in, then promote your user to `admin` via Prisma Studio or SQLite CLI
7. Create your first tree at `/trees/new`
