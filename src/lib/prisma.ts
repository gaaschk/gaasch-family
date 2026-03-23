import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

function createPrismaClient() {
  const connStr = process.env.DATABASE_URL ?? "";
  // Log connection target (password redacted) to help diagnose auth issues
  try {
    const u = new URL(connStr);
    console.log(
      `[prisma] connecting as ${u.username} to ${u.hostname}${u.pathname}`,
    );
  } catch {
    console.log("[prisma] DATABASE_URL unset or unparseable");
  }
  const isLocal =
    connStr.includes("localhost") || connStr.includes("127.0.0.1");
  const pool = new pg.Pool({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  pool.on("error", (err) =>
    console.error("[prisma:pool] idle client error", err),
  );
  // biome-ignore lint/suspicious/noExplicitAny: adapter type mismatch between pg and Prisma generics
  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
