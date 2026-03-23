import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type GedNode = {
  type: string;
  data?: { xref_id?: string; [key: string]: unknown };
  value?: string;
  children?: GedNode[];
};

type GedRoot = { type: "root"; children: GedNode[] };

/**
 * Tolerant GEDCOM parser that accepts non-sequential level numbers (e.g. 3→7)
 * as produced by MyHeritage and other exporters. Uses a stack keyed on level
 * numbers to locate the correct parent for each record.
 */
function parseGedcomTolerant(text: string): GedRoot {
  const root: GedRoot = { type: "root", children: [] };
  // Stack entries: { level, node }. Level -1 = root sentinel.
  const stack: Array<{ level: number; node: GedNode | GedRoot }> = [
    { level: -1, node: root },
  ];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // GEDCOM line format: LEVEL [@XREF@] TAG [VALUE]
    const m = line.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s+(.+))?$/);
    if (!m) continue;

    const level = parseInt(m[1], 10);
    const xref = m[2]; // e.g. "@I1@" or undefined
    const tag = m[3];
    const value = m[4]?.trim() || undefined;

    const node: GedNode = { type: tag, value, children: [] };
    if (xref) node.data = { xref_id: xref };

    // Pop until we find a node strictly below this level
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    if (!parent.children) parent.children = [];
    parent.children.push(node as GedNode);
    stack.push({ level, node });
  }

  return root;
}

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

  // Normalize line endings, strip UTF-8 BOM, and remove blank lines
  // (MyHeritage and other exporters include empty lines that confuse parse-gedcom)
  text = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    // Drop blank lines and non-standard tab-indented continuation lines
    // (MyHeritage exports wrapped text values this way; parse-gedcom can't handle them)
    .filter((line) => line.trim() !== "" && /^\d/.test(line))
    .join("\n");

  if (!text.trim()) return apiError("EMPTY_FILE", "The uploaded file is empty");

  let root: GedRoot;
  try {
    root = parseGedcomTolerant(text);
  } catch (err) {
    console.error("[import] GEDCOM parse error:", err);
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
