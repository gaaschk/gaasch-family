import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type Params = { treeId: string; personId: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, personId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: auth.tree.id },
    include: {
      childInFamilies: {
        include: {
          family: {
            include: {
              husband: {
                select: { id: true, firstName: true, lastName: true },
              },
              wife: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      husbandInFamilies: {
        include: {
          children: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                },
              },
            },
          },
          wife: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      wifeInFamilies: {
        include: {
          children: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                },
              },
            },
          },
          husband: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!person) return apiError("NOT_FOUND", "Person not found", undefined, 404);

  return NextResponse.json(person);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, personId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: auth.tree.id },
  });
  if (!person) return apiError("NOT_FOUND", "Person not found", undefined, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const allowed = [
    "firstName",
    "lastName",
    "maidenName",
    "gender",
    "birthDate",
    "birthPlace",
    "deathDate",
    "deathPlace",
    "occupation",
    "notes",
    "narrative",
  ] as const;

  const data: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in (body as Record<string, unknown>)) {
      const val = (body as Record<string, unknown>)[key];
      data[key] = typeof val === "string" ? val.trim() || null : null;
    }
  }

  const updated = await prisma.person.update({
    where: { id: personId },
    data,
  });

  await prisma.auditLog.create({
    data: {
      treeId: auth.tree.id,
      userId: auth.userId,
      personId,
      action: "update",
      entityType: "person",
      entityId: personId,
      oldJson: JSON.stringify(person),
      newJson: JSON.stringify(updated),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, personId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: auth.tree.id },
  });
  if (!person) return apiError("NOT_FOUND", "Person not found", undefined, 404);

  await prisma.person.delete({ where: { id: personId } });

  await prisma.auditLog.create({
    data: {
      treeId: auth.tree.id,
      userId: auth.userId,
      personId: null,
      action: "delete",
      entityType: "person",
      entityId: personId,
      oldJson: JSON.stringify(person),
    },
  });

  return new NextResponse(null, { status: 204 });
}
