import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";

function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/\n/g, " ").trim();
}

function gedId(id: string, prefix: string): string {
  return `@${prefix}${id.replace(/[^A-Z0-9]/gi, "").slice(0, 18).toUpperCase()}@`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const [people, families] = await Promise.all([
    prisma.person.findMany({
      where: { treeId: auth.tree.id },
      include: {
        childInFamilies: { select: { familyId: true } },
        husbandInFamilies: { select: { id: true } },
        wifeInFamilies: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.family.findMany({
      where: { treeId: auth.tree.id },
      include: {
        children: { select: { personId: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (people.length === 0) {
    return apiError("EMPTY_TREE", "This tree has no people to export", undefined, 404);
  }

  // Build stable GEDCOM IDs — prefer stored gedcomId, fall back to generated
  const personGedId = new Map<string, string>();
  for (const p of people) {
    personGedId.set(p.id, p.gedcomId ? `@${p.gedcomId}@` : gedId(p.id, "I"));
  }
  const familyGedId = new Map<string, string>();
  for (const f of families) {
    familyGedId.set(f.id, f.gedcomId ? `@${f.gedcomId}@` : gedId(f.id, "F"));
  }

  const lines: string[] = [];

  // Header
  lines.push("0 HEAD");
  lines.push("1 SOUR Richmond");
  lines.push("2 NAME Richmond Family History");
  lines.push("2 VERS 1.0");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("1 CHAR UTF-8");
  lines.push(`1 DATE ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}`);

  // Individuals
  for (const p of people) {
    const gid = personGedId.get(p.id)!;
    lines.push(`0 ${gid} INDI`);

    const givn = esc(p.firstName);
    const surn = esc(p.lastName);
    if (givn || surn) {
      lines.push(`1 NAME ${givn} /${surn}/`);
      if (givn) lines.push(`2 GIVN ${givn}`);
      if (surn) lines.push(`2 SURN ${surn}`);
      if (p.maidenName && p.maidenName !== p.lastName) {
        lines.push(`2 _MARN ${esc(p.maidenName)}`);
      }
    }

    if (p.gender === "M" || p.gender === "F") {
      lines.push(`1 SEX ${p.gender}`);
    }

    if (p.birthDate || p.birthPlace) {
      lines.push("1 BIRT");
      if (p.birthDate) lines.push(`2 DATE ${esc(p.birthDate)}`);
      if (p.birthPlace) lines.push(`2 PLAC ${esc(p.birthPlace)}`);
    }

    if (p.deathDate || p.deathPlace) {
      lines.push("1 DEAT Y");
      if (p.deathDate) lines.push(`2 DATE ${esc(p.deathDate)}`);
      if (p.deathPlace) lines.push(`2 PLAC ${esc(p.deathPlace)}`);
    }

    if (p.occupation) lines.push(`1 OCCU ${esc(p.occupation)}`);
    if (p.notes) lines.push(`1 NOTE ${esc(p.notes)}`);

    // Family links
    for (const hf of p.husbandInFamilies) {
      lines.push(`1 FAMS ${familyGedId.get(hf.id)!}`);
    }
    for (const wf of p.wifeInFamilies) {
      lines.push(`1 FAMS ${familyGedId.get(wf.id)!}`);
    }
    for (const cf of p.childInFamilies) {
      lines.push(`1 FAMC ${familyGedId.get(cf.familyId)!}`);
    }
  }

  // Families
  for (const f of families) {
    const gid = familyGedId.get(f.id)!;
    lines.push(`0 ${gid} FAM`);
    if (f.husbandId) lines.push(`1 HUSB ${personGedId.get(f.husbandId)!}`);
    if (f.wifeId) lines.push(`1 WIFE ${personGedId.get(f.wifeId)!}`);
    if (f.marriageDate || f.marriagePlace) {
      lines.push("1 MARR");
      if (f.marriageDate) lines.push(`2 DATE ${esc(f.marriageDate)}`);
      if (f.marriagePlace) lines.push(`2 PLAC ${esc(f.marriagePlace)}`);
    }
    for (const ch of f.children) {
      lines.push(`1 CHIL ${personGedId.get(ch.personId)!}`);
    }
  }

  lines.push("0 TRLR");

  const gedcom = lines.join("\r\n");
  const slug = auth.tree.slug;

  await prisma.auditLog.create({
    data: {
      treeId: auth.tree.id,
      userId: auth.userId,
      action: "export",
      entityType: "person",
      newJson: JSON.stringify({ persons: people.length, families: families.length }),
    },
  });

  return new NextResponse(gedcom, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ged"`,
    },
  });
}
