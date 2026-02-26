# Gaasch Family — Next.js Setup Guide

This project is a Next.js 15 + SQLite + Auth.js rewrite of the static family history site, adding authentication, role-based authorization, and live data editing.

---

## Prerequisites

- Node.js 20+

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in the values:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Leave as `file:./prisma/dev.db` for local development |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `AUTH_URL` | Leave as `http://localhost:3000` for local development |
| `EMAIL_SERVER` | SMTP connection string — see below |
| `EMAIL_FROM` | Display name and address for magic-link emails |

### Email setup (local development)

Use [Ethereal](https://ethereal.email) — a free disposable SMTP inbox for testing:

1. Go to [https://ethereal.email](https://ethereal.email) and click **Create Ethereal Account**
2. Copy the SMTP credentials into `.env.local`:
   ```
   EMAIL_SERVER=smtp://your-user:your-pass@smtp.ethereal.email:587
   EMAIL_FROM="Gaasch Family <noreply@gaasch.family>"
   ```
3. Magic-link emails are captured in the Ethereal web inbox — they are never actually delivered

---

## 3. Run Database Migrations

```bash
npm run db:migrate
```

This creates `prisma/dev.db` with all tables: `people`, `families`, `family_children`, `users`, `accounts`, `sessions`, `verification_tokens`, and `audit_log`.

---

## 4. Seed the Database

Import the 1,798-person dataset from the sibling `gaasch-family` project:

```bash
npm run db:seed
```

This reads `../gaasch-family/src/data/people.json` and `families.json` and upserts all records. It is safe to run multiple times (idempotent).

---

## 5. Create the First Admin

The first time you sign in, Auth.js creates a `User` row with `role = "pending"` and redirects you to `/awaiting-approval`. You need to promote yourself to admin directly in the database.

**Option A — Prisma Studio:**
```bash
npm run db:studio
```
Find your user row in the `users` table and set `role` to `admin`.

**Option B — SQLite CLI:**
```bash
npx prisma db execute --stdin <<'EOF'
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
EOF
```

---

## 6. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Sign in at [http://localhost:3000/login](http://localhost:3000/login) — enter your email, check the Ethereal inbox for the magic link, click it, and you will land on `/admin`.

---

## User Roles

| Role | Can do |
|---|---|
| `pending` | Signed up but not yet approved — redirected to `/awaiting-approval` |
| `viewer` | Read all people and families (public read is also unauthenticated) |
| `editor` | Create and update people and families |
| `admin` | Everything, including delete and managing users |

### Approving pending users

In `/admin/users`, pending users appear in the table. Change their role from `pending` to `viewer`, `editor`, or `admin` and click Save. They can then sign in and access the admin area.

---

## Project Structure

```
gaasch-family-next/
├── prisma/
│   ├── schema.prisma          # SQLite schema (Auth.js + app models)
│   └── dev.db                 # SQLite database file (gitignored)
├── scripts/
│   └── migrate-json.ts        # One-time JSON → SQLite import
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── families/      # Families list + new/edit forms
│   │   │   ├── people/        # People list + new/edit forms
│   │   │   ├── users/         # User management (admin only)
│   │   │   ├── layout.tsx     # Admin shell with sidebar
│   │   │   └── page.tsx       # Dashboard
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # Auth.js handler
│   │   │   ├── export/gedcom/       # GEDCOM 5.5.1 download
│   │   │   ├── families/            # GET list, POST create; GET/PATCH/DELETE/children by id
│   │   │   ├── people/              # GET list, POST create; GET/PATCH/DELETE by id
│   │   │   └── users/               # GET list, POST create; PATCH/DELETE by id; GET /me
│   │   ├── awaiting-approval/ # Shown to pending users after sign-in
│   │   ├── login/             # Magic link login page
│   │   ├── layout.tsx
│   │   └── page.tsx           # Public homepage
│   ├── auth.ts                # Auth.js config (NextAuth v5)
│   ├── components/
│   │   ├── public/            # Public-facing client components (tree, maps, directory)
│   │   ├── FamilyForm.tsx     # Shared family editor
│   │   ├── PersonForm.tsx     # Shared person editor
│   │   └── PersonSearch.tsx   # Typeahead search
│   ├── lib/
│   │   ├── auth.ts            # requireRole() helper
│   │   └── prisma.ts          # Singleton Prisma client
│   ├── middleware.ts           # Auth middleware (protects /admin, pending → /awaiting-approval)
│   └── types/
│       └── index.ts           # TypeScript types
├── .env.local                 # Local env vars (gitignored)
├── .env.local.example         # Template
├── next.config.ts
├── package.json
└── SETUP.md
```
