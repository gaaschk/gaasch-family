export type GedNode = {
  type: string;
  data?: { xref_id?: string; [key: string]: unknown };
  value?: string;
  children?: GedNode[];
};

export type GedRoot = { type: "root"; children: GedNode[] };

/**
 * Tolerant GEDCOM parser that accepts non-sequential level numbers (e.g. 3→7)
 * as produced by MyHeritage and other exporters. Uses a stack keyed on level
 * numbers to locate the correct parent for each record.
 */
export function parseGedcomTolerant(text: string): GedRoot {
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
