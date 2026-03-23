import { type NextRequest, NextResponse } from "next/server";
import { requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type AncestorNode = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  gender: string | null;
  father: AncestorNode | null;
  mother: AncestorNode | null;
};

async function fetchAncestors(
  personId: string,
  treeId: string,
  depth: number,
): Promise<AncestorNode | null> {
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

  let father: AncestorNode | null = null;
  let mother: AncestorNode | null = null;

  if (depth > 0) {
    const familyChild = await prisma.familyChild.findFirst({
      where: { personId: person.id },
      include: { family: true },
    });

    if (familyChild?.family) {
      const { husbandId, wifeId } = familyChild.family;
      const [fatherNode, motherNode] = await Promise.all([
        husbandId ? fetchAncestors(husbandId, treeId, depth - 1) : null,
        wifeId ? fetchAncestors(wifeId, treeId, depth - 1) : null,
      ]);
      father = fatherNode;
      mother = motherNode;
    }
  }

  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    birthDate: person.birthDate,
    deathDate: person.deathDate,
    gender: person.gender,
    father,
    mother,
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

  const rawGen = parseInt(url.searchParams.get("generations") ?? "4", 10);
  const generations = Math.min(Math.max(1, rawGen), 5);

  const root = await fetchAncestors(rootPersonId, auth.tree.id, generations);
  if (!root) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  return NextResponse.json({ root });
}
