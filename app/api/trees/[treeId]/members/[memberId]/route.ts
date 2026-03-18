import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type Params = { treeId: string; memberId: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, memberId } = await params;
  const auth = await requireTreeAccess(treeId, "admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { role } = body as { role?: string };
  if (!role || !["viewer", "editor", "admin"].includes(role)) {
    return apiError("INVALID_ROLE", "Role must be viewer, editor, or admin");
  }

  const member = await prisma.treeMember.findFirst({
    where: { id: memberId, treeId: auth.tree.id },
  });
  if (!member) return apiError("NOT_FOUND", "Member not found", undefined, 404);

  const updated = await prisma.treeMember.update({
    where: { id: memberId },
    data: { role },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, memberId } = await params;
  const auth = await requireTreeAccess(treeId, "admin");
  if (auth instanceof NextResponse) return auth;

  const member = await prisma.treeMember.findFirst({
    where: { id: memberId, treeId: auth.tree.id },
  });
  if (!member) return apiError("NOT_FOUND", "Member not found", undefined, 404);

  await prisma.treeMember.delete({ where: { id: memberId } });

  return new NextResponse(null, { status: 204 });
}
