/**
 * Seed script — safe to run on any database at any time.
 *
 * If no users exist, creates a bootstrap admin from env vars:
 *   SEED_ADMIN_EMAIL    (required)
 *   SEED_ADMIN_PASSWORD (required, min 8 chars)
 *   SEED_ADMIN_NAME     (optional, defaults to "Admin")
 *
 * If users already exist, exits immediately without touching anything.
 */

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as Parameters<typeof PrismaPg>[0]);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} user(s) — skipping seed.`);
    return;
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.log(
      "No SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD set — skipping admin seed.\n" +
        "Set these env vars to bootstrap an admin on a fresh database.",
    );
    return;
  }

  if (password.length < 8) {
    console.error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "admin",
    },
  });

  console.log(`✓ Created admin user: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
