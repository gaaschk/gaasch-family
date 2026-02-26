import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import type { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (id === auth.userId) {
    return NextResponse.json({ error: 'Cannot edit your own account' }, { status: 400 });
  }

  const body = await req.json() as { role?: UserRole; name?: string; forceLogout?: boolean };
  const { role, name, forceLogout } = body;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role         !== undefined && { role }),
      ...(name         !== undefined && { name }),
      ...(forceLogout  && { tokenVersion: { increment: 1 } }),
    },
    select: {
      id:        true,
      email:     true,
      name:      true,
      role:      true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole('admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (id === auth.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
