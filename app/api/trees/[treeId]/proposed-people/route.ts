import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess } from "@/src/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";

  const proposals = await prisma.proposedPerson.findMany({
    where: { treeId: auth.tree.id, status },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json(proposals);
}
