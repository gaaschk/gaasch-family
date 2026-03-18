import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireRole } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET() {
  const auth = await requireRole("viewer");
  if (auth instanceof NextResponse) return auth;

  const [ownedTrees, memberTrees] = await Promise.all([
    prisma.tree.findMany({
      where: { ownerId: auth.userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { people: true, members: true } } },
    }),
    prisma.treeMember.findMany({
      where: { userId: auth.userId },
      include: {
        tree: {
          include: { _count: { select: { people: true, members: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    owned: ownedTrees,
    member: memberTrees
      .filter((m) => m.tree.ownerId !== auth.userId)
      .map((m) => ({ ...m.tree, myRole: m.role })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("viewer");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { name, description } = body as { name?: string; description?: string };

  if (!name?.trim()) {
    return apiError("MISSING_FIELDS", "Tree name is required");
  }

  let slug = slugify(name);
  if (!slug) {
    return apiError(
      "INVALID_NAME",
      "Tree name must contain at least one letter or digit",
    );
  }

  // Ensure slug uniqueness
  const existing = await prisma.tree.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const tree = await prisma.tree.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      ownerId: auth.userId,
    },
    include: { _count: { select: { people: true, members: true } } },
  });

  return NextResponse.json(tree, { status: 201 });
}
