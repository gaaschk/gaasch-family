import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/types';

const ROLE_ORDER: Record<string, number> = {
  pending: -1,
  viewer:   0,
  editor:   1,
  admin:    2,
};

/**
 * Verifies the request has a valid Auth.js session and the user's role
 * meets or exceeds minRole.
 *
 * Returns `{ userId, email, role }` on success, or a NextResponse (401/403) on failure.
 */
export async function requireRole(
  minRole: UserRole,
): Promise<{ userId: string; email: string; role: UserRole } | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (ROLE_ORDER[user.role] < ROLE_ORDER[minRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id, email: user.email, role: user.role as UserRole };
}
