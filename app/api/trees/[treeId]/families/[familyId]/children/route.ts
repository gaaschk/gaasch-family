import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";

type Params = { treeId: string; familyId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, familyId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const family = await prisma.family.findFirst({
    where: { id: familyId, treeId: auth.tree.id },
  });
  if (!family) return apiError("NOT_FOUND", "Family not found", undefined, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { personId } = body as { personId?: string };
  if (!personId) return apiError("MISSING_FIELDS", "personId is required");

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: auth.tree.id },
  });
  if (!person) return apiError("NOT_FOUND", "Person not found in this tree", undefined, 404);

  const existing = await prisma.familyChild.findUnique({
    where: { familyId_personId: { familyId, personId } },
  });
  if (existing) return apiError("ALREADY_EXISTS", "Person is already a child in this family", undefined, 409);

  const child = await prisma.familyChild.create({
    data: { familyId, personId },
    include: { person: { select: { id: true, firstName: true, lastName: true } } },
  });

  return NextResponse.json(child, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, familyId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const personId = url.searchParams.get("personId");
  if (!personId) return apiError("MISSING_FIELDS", "personId query param is required");

  const existing = await prisma.familyChild.findFirst({
    where: { familyId, personId, family: { treeId: auth.tree.id } },
  });
  if (!existing) return apiError("NOT_FOUND", "Child relationship not found", undefined, 404);

  await prisma.familyChild.delete({ where: { familyId_personId: { familyId, personId } } });
  return new NextResponse(null, { status: 204 });
}
