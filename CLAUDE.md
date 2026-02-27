# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js 15 private family history site for the Gaasch family — tracing ten generations from 17th-century Luxembourg to present-day Texas. It features a public landing page, an authenticated site with an interactive genealogy explorer, maps, and a searchable people directory, plus an `/admin` area for data management.

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

## Architecture

### Auth split (Edge + Node)
Auth.js v5 (NextAuth beta) uses **two config files** to satisfy Next.js Edge Runtime constraints:
- `src/auth.config.ts` — Edge-safe config (JWT strategy, callbacks, pages). Used by `middleware.ts`.
- `src/auth.ts` — Full Node.js config, adds the Prisma adapter and Credentials provider (bcrypt). Used by API routes and server components.

Session tokens are JWTs (30-minute expiry). The `role` and `id` fields are embedded in the token via JWT/session callbacks.

### Authorization
`src/lib/auth.ts` exports `requireRole(minRole)` — call at the top of every API route handler. Returns `{ userId, email, role }` or a `NextResponse` (401/403) to return directly. Role hierarchy: `pending (-1) < viewer (0) < editor (1) < admin (2)`.

Middleware (`src/middleware.ts`) redirects unauthenticated users away from `/admin/*` and redirects `pending` users to `/awaiting-approval`.

### Database
SQLite via Prisma. Key models:
- `Person` — genealogy records, GEDCOM-style IDs (e.g. `@I500001@`)
- `Family` — links husband/wife `Person` rows; `FamilyChild` is the join table for children
- `User` / `Account` / `Session` / `VerificationToken` — Auth.js standard tables
- `Setting` — key/value store (currently holds `anthropic_api_key` and `anthropic_model`)
- `AuditLog` — records create/update/delete/generate-narrative actions with old/new JSON

Singleton Prisma client is at `src/lib/prisma.ts`.

### Public homepage (`src/app/page.tsx`)
Server component. Unauthenticated visitors see a `<LandingPage />` static component. Authenticated users see the full site: hero stats (queried live from DB), `<PublicTreeExplorer />`, `<PublicMapsSection />`, and `<PublicDirectorySection />` — all lazy-loaded client components in `src/components/public/`.

### Chapter chain
`src/components/public/chapters.tsx` defines two exports:
- `CHAPTER_CHAIN` — ordered array of the 10 direct-line ancestors (Jean → Kevin), each with `personId`, `name`, `year`.
- `CHAPTER_NARRATIVES` — React JSX narratives keyed by person ID, rendered in the tree explorer.

`DIRECT_LINE_IDS` (a Set) is derived from `CHAPTER_CHAIN` and used to highlight direct ancestors in the explorer.

### AI narrative generation
`POST /api/people/[id]/generate-narrative` — requires `editor` role. Reads `anthropic_api_key` and `anthropic_model` from the `Setting` table (configured via Admin → Settings). Streams Claude's response as `text/plain`, accumulates the full HTML, then saves it to `Person.narrative` and writes an audit log entry.

### API routes pattern
All routes follow the same pattern:
1. Call `requireRole(minRole)` and return early if it's a `NextResponse`
2. Parse params/body
3. Perform DB operations
4. Return `NextResponse.json()`

Routes live under `src/app/api/`: `people/`, `families/`, `users/`, `settings/`, `export/gedcom/`, `import/gedcom/`.

### Admin area
`/admin` is a sidebar-layout section (`src/app/admin/layout.tsx`). Import GEDCOM and Settings nav links are only shown to `admin` role users. All admin pages are server components that call `requireRole` or redirect via Auth.js.

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
4. `npm run db:seed` (requires sibling `../gaasch-family/` project with `src/data/people.json` + `families.json`)
5. `npm run dev`
6. Sign in, then promote your user to `admin` via Prisma Studio or SQLite CLI
