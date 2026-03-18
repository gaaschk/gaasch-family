import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const families = await prisma.family.findMany({
    where: { treeId: auth.tree.id },
    include: {
      husband: { select: { id: true, firstName: true, lastName: true } },
      wife: { select: { id: true, firstName: true, lastName: true } },
      children: {
        include: { person: { select: { id: true, firstName: true, lastName: true, gender: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(families);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { husbandId, wifeId, marriageDate, marriagePlace } = body as {
    husbandId?: string;
    wifeId?: string;
    marriageDate?: string;
    marriagePlace?: string;
  };

  if (!husbandId && !wifeId) {
    return apiError("MISSING_FIELDS", "At least one spouse (husbandId or wifeId) is required");
  }

  // Verify people belong to this tree
  const personIds = [husbandId, wifeId].filter(Boolean) as string[];
  if (personIds.length > 0) {
    const count = await prisma.person.count({
      where: { id: { in: personIds }, treeId: auth.tree.id },
    });
    if (count !== personIds.length) {
      return apiError("INVALID_PERSONS", "One or more persons not found in this tree", undefined, 404);
    }
  }

  const family = await prisma.family.create({
    data: {
      treeId: auth.tree.id,
      husbandId: husbandId ?? null,
      wifeId: wifeId ?? null,
      marriageDate: marriageDate?.trim() ?? null,
      marriagePlace: marriagePlace?.trim() ?? null,
    },
    include: {
      husband: { select: { id: true, firstName: true, lastName: true } },
      wife: { select: { id: true, firstName: true, lastName: true } },
      children: true,
    },
  });

  return NextResponse.json(family, { status: 201 });
}
