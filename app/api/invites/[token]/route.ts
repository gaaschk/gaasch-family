import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireRole, apiError } from "@/src/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invite = await prisma.treeInvite.findUnique({
    where: { token },
    include: { tree: { select: { name: true, slug: true } } },
  });

  if (!invite) return apiError("NOT_FOUND", "Invite not found", undefined, 404);
  if (invite.expiresAt < new Date()) return apiError("EXPIRED", "Invite has expired", undefined, 410);
  if (invite.acceptedAt) return apiError("ALREADY_ACCEPTED", "Invite already used", undefined, 410);

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    treeName: invite.tree.name,
    treeSlug: invite.tree.slug,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const auth = await requireRole("viewer");
  if (auth instanceof NextResponse) return auth;

  const invite = await prisma.treeInvite.findUnique({
    where: { token },
    include: { tree: true },
  });

  if (!invite) return apiError("NOT_FOUND", "Invite not found", undefined, 404);
  if (invite.expiresAt < new Date()) return apiError("EXPIRED", "Invite has expired", undefined, 410);
  if (invite.acceptedAt) return apiError("ALREADY_ACCEPTED", "Invite already used", undefined, 410);

  // The invite was sent to a specific email; verify it matches
  if (invite.email !== auth.email.toLowerCase()) {
    return apiError(
      "EMAIL_MISMATCH",
      "This invite was sent to a different email address",
      undefined,
      403,
    );
  }

  // Add member (upsert — might already be a member with a lower role)
  await prisma.treeMember.upsert({
    where: { treeId_userId: { treeId: invite.treeId, userId: auth.userId } },
    update: { role: invite.role },
    create: { treeId: invite.treeId, userId: auth.userId, role: invite.role },
  });

  await prisma.treeInvite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ treeSlug: invite.tree.slug });
}
