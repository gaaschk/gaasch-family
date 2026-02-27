import { prisma } from './prisma';

/**
 * Read a value from the SystemSetting table (global, not per-tree).
 * Falls back to an env var if the DB row is absent or empty.
 */
export async function getSystemSetting(key: string, envFallback?: string): Promise<string> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch { /* DB not available during build */ }
  return (envFallback ? process.env[envFallback] : undefined) ?? '';
}
