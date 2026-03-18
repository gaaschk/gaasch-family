import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";
import { deleteObject, presignGet } from "@/src/lib/s3";

type Params = { treeId: string; documentId: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, documentId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const doc = await prisma.document.findFirst({
    where: { id: documentId, treeId: auth.tree.id },
  });
  if (!doc) return apiError("NOT_FOUND", "Document not found", undefined, 404);

  const url = await presignGet(doc.s3Key);
  return NextResponse.json({ ...doc, url });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, documentId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const doc = await prisma.document.findFirst({
    where: { id: documentId, treeId: auth.tree.id },
  });
  if (!doc) return apiError("NOT_FOUND", "Document not found", undefined, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { caption, category } = body as { caption?: string | null; category?: string };

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      ...(caption !== undefined ? { caption } : {}),
      ...(category !== undefined ? { category } : {}),
    },
  });

  const url = await presignGet(updated.s3Key);
  return NextResponse.json({ ...updated, url });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, documentId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const doc = await prisma.document.findFirst({
    where: { id: documentId, treeId: auth.tree.id },
  });
  if (!doc) return apiError("NOT_FOUND", "Document not found", undefined, 404);

  // Remove portrait reference if this was the portrait
  await prisma.person.updateMany({
    where: { portraitId: doc.id },
    data: { portraitId: null },
  });

  await prisma.document.delete({ where: { id: doc.id } });

  // Best-effort S3 delete
  deleteObject(doc.s3Key).catch(() => {});

  await prisma.auditLog.create({
    data: {
      treeId: auth.tree.id,
      userId: auth.userId,
      personId: doc.personId ?? null,
      action: "delete",
      entityType: "document",
      entityId: doc.id,
      oldJson: JSON.stringify({ filename: doc.filename, category: doc.category }),
    },
  });

  return NextResponse.json({ ok: true });
}
