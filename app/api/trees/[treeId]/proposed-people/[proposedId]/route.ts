import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";

type Params = { treeId: string; proposedId: string };

// PATCH: accept or reject a proposed person
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, proposedId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const proposal = await prisma.proposedPerson.findFirst({
    where: { id: proposedId, treeId: auth.tree.id, status: "pending" },
  });
  if (!proposal) return apiError("NOT_FOUND", "Proposal not found or already reviewed", undefined, 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { action } = body as { action?: string };
  if (action !== "accept" && action !== "reject") {
    return apiError("INVALID_ACTION", "action must be 'accept' or 'reject'");
  }

  if (action === "reject") {
    const updated = await prisma.proposedPerson.update({
      where: { id: proposal.id },
      data: {
        status: "rejected",
        reviewedById: auth.userId,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  }

  // accept — create a real Person from proposedData
  const data = JSON.parse(proposal.proposedData) as {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    birthPlace?: string;
    deathDate?: string;
    deathPlace?: string;
    occupation?: string;
    notes?: string;
    note?: string;
  };

  const person = await prisma.$transaction(async (tx) => {
    const created = await tx.person.create({
      data: {
        treeId: auth.tree.id,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        birthDate: data.birthDate ?? null,
        birthPlace: data.birthPlace ?? null,
        deathDate: data.deathDate ?? null,
        deathPlace: data.deathPlace ?? null,
        occupation: data.occupation ?? null,
        notes: [data.notes, data.note ? `Source: ${data.note}` : null].filter(Boolean).join("\n") || null,
      },
    });

    await tx.proposedPerson.update({
      where: { id: proposal.id },
      data: {
        status: "accepted",
        reviewedById: auth.userId,
        reviewedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        treeId: auth.tree.id,
        userId: auth.userId,
        personId: created.id,
        action: "create",
        entityType: "person",
        entityId: created.id,
        newJson: JSON.stringify({ source: proposal.source, externalId: proposal.externalId }),
      },
    });

    return created;
  });

  return NextResponse.json({ proposal: { ...proposal, status: "accepted" }, person });
}
