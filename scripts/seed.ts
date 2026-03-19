/**
 * Seed script — safe to run on any database at any time.
 *
 * If no users exist, creates a bootstrap admin:
 *   email: gaaschk@gmail.com
 *   name:  Kevin Gaasch
 *   role:  admin
 *   password: auto-generated and printed to stdout (check PM2 logs after first deploy)
 *
 * If users already exist, exits immediately without touching anything.
 */

import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

const ADMIN_EMAIL = "gaaschk@gmail.com";
const ADMIN_NAME = "Kevin Gaasch";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// biome-ignore lint/suspicious/noExplicitAny: adapter type mismatch between pg and Prisma generics
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.log(
      `Database already has ${existingCount} user(s) — skipping seed.`,
    );
    return;
  }

  // Generate a secure random password: 24 chars of base64url
  const password = randomBytes(18).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
    },
  });

  console.log("=".repeat(60));
  console.log("BOOTSTRAP ADMIN CREATED");
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${password}`);
  console.log(`  id:       ${user.id}`);
  console.log("Change this password after first login.");
  console.log("=".repeat(60));
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
