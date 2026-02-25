# Gaasch Family — Next.js Setup Guide

This project is a Next.js 15 + Supabase + Prisma rewrite of the static family history site, adding authentication, role-based authorization, and live data editing.

---

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)

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

Open `.env.local` and fill in the values from your Supabase project:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon key |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection Pooling (port 6543, **Transaction** mode) |
| `DIRECT_URL` | Supabase Dashboard → Settings → Database → Direct connection (port 5432) |

> **Important**: `DATABASE_URL` uses the **pooler** (port 6543) for runtime queries.
> `DIRECT_URL` uses the **direct** connection (port 5432) for Prisma migrations only.

---

## 3. Run Database Migrations

```bash
npm run db:migrate
```

This creates the `people`, `families`, `family_children`, `user_profiles`, and `audit_log` tables in your Supabase database.

---

## 4. Seed the Database

Import the 1,798-person dataset from the sibling `gaasch-family` project:

```bash
npm run db:seed
```

This reads `../gaasch-family/src/data/people.json` and `families.json` and upserts all records. It is safe to run multiple times (idempotent).

---

## 5. Configure Supabase Auth

In the Supabase Dashboard:

1. **Authentication → Settings → Email** — enable "Magic Links" (OTP via email)
2. **Authentication → URL Configuration** — add `http://localhost:3000/auth/callback` to "Redirect URLs"
3. **Authentication → Settings** — set "Site URL" to `http://localhost:3000`

---

## 6. Set Up Row Level Security (RLS)

Run the following SQL in the Supabase SQL Editor to enable RLS:

```sql
-- Enable RLS on all tables
ALTER TABLE people         ENABLE ROW LEVEL SECURITY;
ALTER TABLE families       ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log      ENABLE ROW LEVEL SECURITY;

-- Public read access (all tables except user_profiles)
CREATE POLICY "public_read_people"
  ON people FOR SELECT USING (true);

CREATE POLICY "public_read_families"
  ON families FOR SELECT USING (true);

CREATE POLICY "public_read_family_children"
  ON family_children FOR SELECT USING (true);

-- Editor/admin write access
CREATE POLICY "editor_write_people"
  ON people FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "editor_write_families"
  ON families FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "editor_write_family_children"
  ON family_children FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'editor')
    )
  );

-- Users can read their own profile; admin can read all
CREATE POLICY "read_own_profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Trigger: create user_profile on new sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 7. Promote the First Admin

After signing in once via the magic link, run in the SQL Editor:

```sql
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

---

## 8. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Roles

| Role | Can do |
|---|---|
| `viewer` | Read all people and families (public read is also unauthenticated) |
| `editor` | Create and update people and families |
| `admin` | Everything, including delete and managing users |

---

## Project Structure

```
gaasch-family-next/
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/
│   └── migrate-json.ts        # One-time JSON → Postgres import
├── src/
│   ├── app/
│   │   ├── admin/             # Admin dashboard (protected)
│   │   ├── api/
│   │   │   ├── people/        # GET list, POST create; GET/PATCH/DELETE by id
│   │   │   └── families/      # GET list, POST create; GET/PATCH/DELETE by id
│   │   ├── auth/callback/     # Supabase auth callback
│   │   ├── login/             # Magic link login page
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── prisma.ts          # Singleton Prisma client
│   │   └── supabase/
│   │       ├── client.ts      # Browser Supabase client
│   │       └── server.ts      # Server Supabase client (cookies)
│   ├── middleware.ts           # Auth middleware (protects /admin)
│   └── types/
│       └── index.ts           # TypeScript types
├── .env.local.example
├── next.config.ts
├── package.json
└── SETUP.md
```
