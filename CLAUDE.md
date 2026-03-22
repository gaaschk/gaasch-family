# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate from the design system without explicit user approval.
In QA mode, flag any code that doesn't match `DESIGN.md`.

## What This Is

A Next.js 15 multi-tenant private family history platform. Multiple families can each own a private genealogy tree — with an interactive explorer, searchable people directory, and AI-generated biographical narratives. Users are invited to trees by tree admins.

## Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # Biome check

npm run db:migrate       # Run Prisma migrations against .env.local
npm run db:seed          # Create bootstrap admin user on empty DB
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:push          # Push schema to DB without migration (dev only)
```

All `db:*` scripts use `dotenv -e .env.local` to inject `DATABASE_URL`.

After any `prisma/schema.prisma` change, run `npm run db:migrate` (creates a migration) then `npm run db:generate` (regenerates the client).

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
`src/lib/auth.ts` exports three helpers:
- `requireRole(minRole)` — platform-level (create trees, approve users). Returns `{ userId, email, role }` or `NextResponse` 401/403.
- `requireTreeAccess(treeIdOrSlug, minRole)` — tree-scoped; checks platform admin, tree owner, or TreeMember row. Tree owners always get `admin` tree role. Returns `{ userId, email, treeRole, tree }` or `NextResponse`.
- `requireTreeAccessOrToken(req, treeIdOrSlug, minRole)` — same as `requireTreeAccess`, plus `Authorization: Bearer` fallback checked against the tree's `api_token` setting.

Role hierarchies:
- Platform: `pending (-1) < viewer (0) < editor (1) < admin (2)`
- Tree: `viewer (0) < editor (1) < admin (2)`

Middleware (`src/middleware.ts`) redirects unauthenticated users away from `/dashboard`, `/trees/*`, `/invite/*`, and redirects `pending` users to `/awaiting-approval`.

### Database
PostgreSQL via Prisma. Key models:
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
`POST /api/trees/[treeId]/people/[personId]/generate-narrative` — requires `editor` tree role or Bearer token. Reads `anthropic_api_key` and `anthropic_model` from the tree's `Setting` rows. Streams Claude's response as `text/plain`, accumulates full HTML, saves to `Person.narrative`, writes audit log.

### Tree view page
`app/trees/[slug]/page.tsx` — server component. Verifies session + tree membership via `requireTreeAccess`, then renders tree stats, recent people, and `<PeopleDirectory>`.

## Environment Variables

Required in `.env.local`:
| Variable | Notes |
|---|---|
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/heirloom_dev` locally |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` locally |
| `EMAIL_SERVER` | SMTP string (use Ethereal for local dev) |
| `EMAIL_FROM` | Display name + address |

The Anthropic API key is stored in the DB (`Setting` table), not in `.env`.

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills:
- `/plan-ceo-review` — CEO/founder-mode plan review
- `/plan-eng-review` — Engineering manager plan review
- `/plan-design-review` — Designer's eye plan review
- `/design-consultation` — Design system consultation
- `/review` — Pre-landing PR review
- `/ship` — Ship workflow (test, review, bump, push, PR)
- `/browse` — Headless browser for QA and dogfooding
- `/qa` — QA test and fix bugs
- `/qa-only` — QA report only (no fixes)
- `/design-review` — Visual QA and design polish
- `/setup-browser-cookies` — Import cookies from real browser
- `/retro` — Weekly engineering retrospective
- `/document-release` — Post-ship documentation update

If gstack skills aren't working, run:
```bash
cd .claude/skills/gstack && ./setup
```
This builds the binary and registers the skills.

## PR workflow

When creating a PR:
1. **Rebase and squash first.** Before `gh pr create`, rebase onto `origin/main` and squash iterative fix commits into clean, logical commits. Use `git reset --soft origin/main` + re-commit, or interactive rebase.
2. **Monitor CI checks.** After creating the PR, run `gh pr checks <number> --watch`. If checks fail, read logs with `gh run view <run-id> --log-failed`, fix the issue, commit, push, and monitor again. Do not tell the user the PR is ready until all checks pass.
3. **Fix deploy failures too.** If the deploy workflow fails after merge, investigate and fix proactively — don't wait for the user to report it.

## Deploy pipeline

- CI runs lint, typecheck, and build. The deploy workflow runs on push to `main`.
- `prisma db push` runs in CI using `DB_PASSWORD` GitHub secret to construct the full `DATABASE_URL`. The standalone build on the server does NOT have `node_modules`, so prisma CLI cannot run there.
- The app runs on AWS Lightsail. Runtime env vars (including `DATABASE_URL`) live in `/var/www/heirloom/.env.production` on the server — NOT in GitHub secrets.

## Prisma 7 config

This project uses Prisma 7 with `prisma.config.ts`. Three rules:
1. **No `url` in `schema.prisma`** — Prisma 7 forbids it when `prisma.config.ts` exists.
2. **Use `datasource.url` in `prisma.config.ts`** — not `migrate.url` or any other property.
3. **Use `process.env.DATABASE_URL`** — not the `env()` helper from `prisma/config`, which throws when the variable is undefined and breaks CI steps that don't need a DB connection.

## Deploy Configuration (configured by /setup-deploy)
- Platform: AWS Lightsail (Ubuntu, custom deploy via GitHub Actions)
- Production URL: https://family.kevingaasch.com
- Deploy workflow: `.github/workflows/deploy.yml` (triggers on CI success on `main`)
- Deploy status command: `gh run list --workflow=deploy.yml --limit 1`
- Merge method: squash
- Project type: web app (Next.js 15 standalone)
- Post-deploy health check: `curl -sf https://family.kevingaasch.com -o /dev/null -w "%{http_code}"`

### Custom deploy hooks
- Pre-merge: CI workflow runs lint, typecheck, build (`.github/workflows/ci.yml`)
- Deploy trigger: automatic — deploy.yml fires when CI passes on `main`
- Deploy status: `gh run list --workflow=deploy.yml --limit 1 --json status,conclusion -q '.[0]'`
- Health check: `curl -sf https://family.kevingaasch.com -o /dev/null -w "%{http_code}"`
- Process manager: PM2 (process name: `heirloom`)
- Server path: `/var/www/heirloom/`
- SSH: `ssh -i ~/.ssh/deploy_key ubuntu@{DEPLOY_HOST}` (host in GitHub secrets)

## First-time setup

1. `npm install`
2. `cp .env.local.example .env.local` and fill in values
3. `npm run db:migrate`
4. `npm run db:seed` (creates bootstrap admin on first run; no-op if users exist)
5. `npm run dev`
6. Sign in with the bootstrap admin credentials printed by the seed step
7. Create your first tree at `/trees/new`
