import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const where = {
    treeId: auth.tree.id,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { maidenName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [people, total] = await Promise.all([
    prisma.person.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: offset,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        maidenName: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        deathDate: true,
        portraitId: true,
      },
    }),
    prisma.person.count({ where }),
  ]);

  return NextResponse.json({ people, total, page, pages: Math.ceil(total / limit) });
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

  const {
    firstName, lastName, maidenName, gender,
    birthDate, birthPlace, deathDate, deathPlace, occupation, notes,
  } = body as Record<string, string | undefined>;

  if (!firstName?.trim() && !lastName?.trim()) {
    return apiError("MISSING_FIELDS", "At least a first or last name is required");
  }

  const validGenders = ["M", "F", "U", undefined, null, ""];
  if (gender && !validGenders.includes(gender)) {
    return apiError("INVALID_GENDER", "Gender must be M, F, or U");
  }

  const person = await prisma.person.create({
    data: {
      treeId: auth.tree.id,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      maidenName: maidenName?.trim() || null,
      gender: gender?.trim() || null,
      birthDate: birthDate?.trim() || null,
      birthPlace: birthPlace?.trim() || null,
      deathDate: deathDate?.trim() || null,
      deathPlace: deathPlace?.trim() || null,
      occupation: occupation?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      treeId: auth.tree.id,
      userId: auth.userId,
      personId: person.id,
      action: "create",
      entityType: "person",
      entityId: person.id,
      newJson: JSON.stringify(person),
    },
  });

  return NextResponse.json(person, { status: 201 });
}
