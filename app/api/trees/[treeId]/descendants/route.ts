import { type NextRequest, NextResponse } from "next/server";
import { requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type DescendantNode = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  gender: string | null;
  children: DescendantNode[];
};

async function fetchDescendants(
  personId: string,
  treeId: string,
  depth: number,
): Promise<DescendantNode | null> {
  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      deathDate: true,
      gender: true,
    },
  });

  if (!person) return null;

  let children: DescendantNode[] = [];

  if (depth > 0) {
    const families = await prisma.family.findMany({
      where: {
        treeId,
        OR: [{ husbandId: person.id }, { wifeId: person.id }],
      },
      include: {
        children: { select: { personId: true } },
      },
    });

    const childIds = families.flatMap((f) => f.children.map((c) => c.personId));

    const childNodes = await Promise.all(
      childIds.map((childId) => fetchDescendants(childId, treeId, depth - 1)),
    );

    children = childNodes.filter((n): n is DescendantNode => n !== null);
  }

  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    birthDate: person.birthDate,
    deathDate: person.deathDate,
    gender: person.gender,
    children,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const rootPersonId = url.searchParams.get("rootPersonId");
  if (!rootPersonId) {
    return NextResponse.json(
      { error: "rootPersonId is required" },
      { status: 400 },
    );
  }

  const rawGen = parseInt(url.searchParams.get("generations") ?? "3", 10);
  const generations = Math.min(Math.max(1, rawGen), 6);

  const root = await fetchDescendants(rootPersonId, auth.tree.id, generations);
  if (!root) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  return NextResponse.json({ root });
}
