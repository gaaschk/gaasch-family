// Shared types and utilities for PedigreeView and FanChartView.

export type AncestorNode = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  gender: string | null;
  father: AncestorNode | null;
  mother: AncestorNode | null;
};

export type DescNode = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  gender: string | null;
  children: DescNode[];
};

export function formatYear(date: string): string {
  const m = date.match(/\b(\d{4})\b/);
  return m ? m[1] : date;
}

export function lifespanText(
  birthDate: string | null,
  deathDate: string | null,
): string {
  if (!birthDate && !deathDate) return "";
  const b = birthDate ? formatYear(birthDate) : "?";
  const d = deathDate ? formatYear(deathDate) : "";
  return d ? `${b}–${d}` : `b. ${b}`;
}

export function flatten(
  node: AncestorNode | null,
  num: number,
  maxGen: number,
  map: Map<number, AncestorNode>,
): void {
  if (!node || Math.floor(Math.log2(num)) >= maxGen) return;
  map.set(num, node);
  flatten(node.father, num * 2, maxGen, map);
  flatten(node.mother, num * 2 + 1, maxGen, map);
}

export function leafCount(node: DescNode, maxDepth: number): number {
  if (maxDepth === 0 || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + leafCount(c, maxDepth - 1), 0);
}

/** Returns the set of Ahnentafel numbers on the direct path from nodeNum down to 1. */
export function bloodlinePath(nodeNum: number): Set<number> {
  const path = new Set<number>();
  let n = nodeNum;
  while (n >= 1) {
    path.add(n);
    n = Math.floor(n / 2);
  }
  return path;
}
