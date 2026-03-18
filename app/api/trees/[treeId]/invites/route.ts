import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { sendTreeInviteEmail } from "@/src/lib/email";
import { prisma } from "@/src/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { email, role = "viewer" } = body as { email?: string; role?: string };

  if (!email?.trim()) {
    return apiError("MISSING_FIELDS", "Email is required");
  }

  const validRoles = ["viewer", "editor", "admin"];
  if (!validRoles.includes(role)) {
    return apiError("INVALID_ROLE", "Role must be viewer, editor, or admin");
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Upsert: if an unexpired invite already exists, replace it
  const existing = await prisma.treeInvite.findFirst({
    where: {
      treeId: auth.tree.id,
      email: email.trim().toLowerCase(),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  let invite: { id: string; token: string; email: string };
  if (existing) {
    invite = await prisma.treeInvite.update({
      where: { id: existing.id },
      data: { role, expiresAt, invitedById: auth.userId },
    });
  } else {
    invite = await prisma.treeInvite.create({
      data: {
        treeId: auth.tree.id,
        email: email.trim().toLowerCase(),
        role,
        invitedById: auth.userId,
        expiresAt,
      },
    });
  }

  const inviteUrl = `${process.env.AUTH_URL ?? ""}/invite/${invite.token}`;

  // Send invite email (best-effort, non-blocking)
  try {
    await sendTreeInviteEmail({
      toEmail: invite.email,
      treeName: auth.tree.name,
      inviteUrl,
      role,
    });
  } catch {
    // email failure is not fatal
  }

  return NextResponse.json({ ok: true, token: invite.token }, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "admin");
  if (auth instanceof NextResponse) return auth;

  const invites = await prisma.treeInvite.findMany({
    where: {
      treeId: auth.tree.id,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}
