import { type NextRequest, NextResponse } from "next/server";
import { parse as parseGedcom } from "parse-gedcom";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type GedNode = {
  type: string;
  data?: { xref_id?: string; [key: string]: unknown };
  value?: string;
  children?: GedNode[];
};

type GedRoot = { type: "root"; children: GedNode[] };

function child(node: GedNode, type: string): GedNode | undefined {
  return node.children?.find((n) => n.type === type);
}

function val(node: GedNode, type: string): string | null {
  return child(node, type)?.value?.trim() || null;
}

function deepVal(node: GedNode, ...types: string[]): string | null {
  let cur: GedNode | undefined = node;
  for (const t of types) {
    cur = cur?.children?.find((n) => n.type === t);
    if (!cur) return null;
  }
  return cur?.value?.trim() || null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  let text: string;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return apiError("MISSING_FILE", "A .ged file is required");
    }
    text = await (file as File).text();
  } else {
    text = await req.text();
  }

  if (!text.trim()) return apiError("EMPTY_FILE", "The uploaded file is empty");

  let root: GedRoot;
  try {
    root = parseGedcom(text) as GedRoot;
  } catch {
    return apiError(
      "PARSE_ERROR",
      "Could not parse GEDCOM file — ensure it is a valid .ged file",
    );
  }

  const nodes = root.children ?? [];
  const indis = nodes.filter((n) => n.type === "INDI");
  const fams = nodes.filter((n) => n.type === "FAM");

  if (indis.length === 0) {
    return apiError("EMPTY_GEDCOM", "No individuals found in GEDCOM file");
  }

  const gedcomIdToPersonId = new Map<string, string>();

  for (const indi of indis) {
    const gedcomId = indi.data?.xref_id?.replace(/@/g, "") ?? null;
    const nameNode = child(indi, "NAME");

    let firstName: string | null = null;
    let lastName: string | null = null;

    if (nameNode) {
      // Prefer GIVN/SURN sub-tags
      const givn = val(nameNode, "GIVN");
      const surn = val(nameNode, "SURN");
      if (givn || surn) {
        firstName = givn;
        lastName = surn;
      } else if (nameNode.value) {
        // Parse "First /Last/" format
        const m = nameNode.value.match(/^(.*?)\s*\/(.+?)\//);
        if (m) {
          firstName = m[1].trim() || null;
          lastName = m[2].trim() || null;
        } else {
          firstName = nameNode.value.trim() || null;
        }
      }
    }

    const gender =
      val(indi, "SEX")?.toUpperCase() === "M"
        ? "M"
        : val(indi, "SEX")?.toUpperCase() === "F"
          ? "F"
          : null;

    const birthDate = deepVal(indi, "BIRT", "DATE");
    const birthPlace = deepVal(indi, "BIRT", "PLAC");
    const deathDate = child(indi, "DEAT")
      ? deepVal(indi, "DEAT", "DATE")
      : null;
    const deathPlace = child(indi, "DEAT")
      ? deepVal(indi, "DEAT", "PLAC")
      : null;
    const occupation = val(indi, "OCCU");
    const notes = val(indi, "NOTE");

    let person: { id: string } | null = null;
    if (gedcomId) {
      const existing = await prisma.person.findUnique({
        where: { treeId_gedcomId: { treeId: auth.tree.id, gedcomId } },
      });
      if (existing) {
        person = await prisma.person.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            gender,
            birthDate,
            birthPlace,
            deathDate,
            deathPlace,
            occupation,
            notes,
          },
        });
      } else {
        person = await prisma.person.create({
          data: {
            treeId: auth.tree.id,
            gedcomId,
            firstName,
            lastName,
            gender,
            birthDate,
            birthPlace,
            deathDate,
            deathPlace,
            occupation,
            notes,
          },
        });
      }
      gedcomIdToPersonId.set(gedcomId, person.id);
    } else {
      person = await prisma.person.create({
        data: {
          treeId: auth.tree.id,
          firstName,
          lastName,
          gender,
          birthDate,
          birthPlace,
          deathDate,
          deathPlace,
          occupation,
          notes,
        },
      });
    }
  }

  let familiesImported = 0;
  for (const fam of fams) {
    const famGedcomId = fam.data?.xref_id?.replace(/@/g, "") ?? null;

    const husbRef = val(fam, "HUSB")?.replace(/@/g, "").trim();
    const wifeRef = val(fam, "WIFE")?.replace(/@/g, "").trim();
    const childRefs = (fam.children ?? [])
      .filter((n) => n.type === "CHIL")
      .map((n) => n.value?.replace(/@/g, "").trim() ?? "");

    const husbandId = husbRef
      ? (gedcomIdToPersonId.get(husbRef) ?? null)
      : null;
    const wifeId = wifeRef ? (gedcomIdToPersonId.get(wifeRef) ?? null) : null;
    const marriageDate = deepVal(fam, "MARR", "DATE");
    const marriagePlace = deepVal(fam, "MARR", "PLAC");

    let family: { id: string } | null = null;
    if (famGedcomId) {
      const existing = await prisma.family.findUnique({
        where: {
          treeId_gedcomId: { treeId: auth.tree.id, gedcomId: famGedcomId },
        },
      });
      if (existing) {
        family = await prisma.family.update({
          where: { id: existing.id },
          data: { husbandId, wifeId, marriageDate, marriagePlace },
        });
      } else {
        family = await prisma.family.create({
          data: {
            treeId: auth.tree.id,
            gedcomId: famGedcomId,
            husbandId,
            wifeId,
            marriageDate,
            marriagePlace,
          },
        });
      }
    } else {
      family = await prisma.family.create({
        data: {
          treeId: auth.tree.id,
          husbandId,
          wifeId,
          marriageDate,
          marriagePlace,
        },
      });
    }

    for (const childRef of childRefs) {
      const childPersonId = gedcomIdToPersonId.get(childRef);
      if (!childPersonId) continue;
      await prisma.familyChild.upsert({
        where: {
          familyId_personId: { familyId: family.id, personId: childPersonId },
        },
        update: {},
        create: { familyId: family.id, personId: childPersonId },
      });
    }
    familiesImported++;
  }

  await prisma.auditLog.create({
    data: {
      treeId: auth.tree.id,
      userId: auth.userId,
      action: "import",
      entityType: "person",
      newJson: JSON.stringify({
        gedcomPersons: indis.length,
        families: fams.length,
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    personsImported: gedcomIdToPersonId.size,
    familiesImported,
  });
}
