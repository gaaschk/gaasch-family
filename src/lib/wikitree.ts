/**
 * WikiTree API client — no auth required.
 * https://github.com/wikitree/wikitree-api
 */
import type { FsPersonSummary, FsSearchEntry } from './familysearch';

const WIKITREE_API = 'https://api.wikitree.com/api.php';
const APP_ID = 'gaasch-family-v1';

interface WikiTreePerson {
  Id:               number;
  Name:             string; // e.g. "Gaasch-7"
  FirstName:        string;
  LastNameAtBirth:  string;
  BirthDate:        string; // YYYY-MM-DD or ""
  BirthLocation:    string;
  DeathDate:        string;
  DeathLocation:    string;
  Gender:           string; // "Male" | "Female" | ""
}

interface WikiTreeSearchResponse {
  status:   number;
  matches?: WikiTreePerson[];
}

function mapWikiTreePerson(p: WikiTreePerson): FsPersonSummary {
  return {
    pid:         p.Name,
    name:        [p.FirstName, p.LastNameAtBirth].filter(Boolean).join(' ') || p.Name,
    sex:         p.Gender === 'Male' ? 'M' : p.Gender === 'Female' ? 'F' : null,
    birthDate:   p.BirthDate  || null,
    birthPlace:  p.BirthLocation  || null,
    deathDate:   p.DeathDate  || null,
    deathPlace:  p.DeathLocation  || null,
    burialDate:  null,
    burialPlace: null,
    occupation:  null,
  };
}

/**
 * Compute a relevance score for a WikiTree result compared to tree-person data.
 * WikiTree does not return a numeric score, so we approximate one.
 */
function computeScore(
  result: WikiTreePerson,
  birthYear?: number,
  birthPlace?: string | null,
  deathYear?: number,
  deathPlace?: string | null,
  queryName?: string,
): number {
  let score = 55;

  // Birth year
  if (birthYear && result.BirthDate) {
    const ry = parseInt(result.BirthDate.slice(0, 4), 10);
    if (!isNaN(ry) && Math.abs(ry - birthYear) <= 10) score += 15;
  }

  // Birth location
  if (birthPlace && result.BirthLocation) {
    const treeParts  = birthPlace.toLowerCase().split(/[\s,]+/);
    const wikiParts  = result.BirthLocation.toLowerCase().split(/[\s,]+/);
    if (treeParts.some(w => w.length > 2 && wikiParts.includes(w))) score += 10;
  }

  // Death year
  if (deathYear && result.DeathDate) {
    const ry = parseInt(result.DeathDate.slice(0, 4), 10);
    if (!isNaN(ry) && Math.abs(ry - deathYear) <= 10) score += 15;
  }

  // Death location
  if (deathPlace && result.DeathLocation) {
    const treeParts = deathPlace.toLowerCase().split(/[\s,]+/);
    const wikiParts = result.DeathLocation.toLowerCase().split(/[\s,]+/);
    if (treeParts.some(w => w.length > 2 && wikiParts.includes(w))) score += 5;
  }

  // Name similarity (simple: query name appears in result name)
  if (queryName) {
    const fullName = [result.FirstName, result.LastNameAtBirth].join(' ').toLowerCase();
    const qLower = queryName.toLowerCase();
    if (fullName.includes(qLower) || qLower.includes(result.LastNameAtBirth.toLowerCase())) {
      score += 5;
    }
  }

  return Math.min(score, 95);
}

export async function searchWikiTree(
  firstName: string,
  lastName: string,
  birthYear?: number,
  count = 5,
  treePerson?: {
    birthPlace?: string | null;
    deathDate?: string | null;
    deathPlace?: string | null;
  },
): Promise<FsSearchEntry[]> {
  const params = new URLSearchParams({
    action:    'searchPerson',
    FirstName: firstName,
    LastName:  lastName,
    limit:     String(count),
    appId:     APP_ID,
    fields:    'Id,Name,FirstName,LastNameAtBirth,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender',
  });
  if (birthYear) params.set('BirthDate', String(birthYear));

  const res = await fetch(`${WIKITREE_API}?${params}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`WikiTree API error: ${res.status}`);

  // WikiTree returns an array: [{ status, matches, total, ... }]
  const raw = await res.json() as WikiTreeSearchResponse[];
  const matches = raw[0]?.matches ?? [];

  const deathYear = treePerson?.deathDate
    ? parseInt(treePerson.deathDate.match(/\d{4}/)?.[0] ?? '', 10) || undefined
    : undefined;

  return matches.map(m => ({
    id:     m.Name,
    score:  computeScore(
      m,
      birthYear,
      treePerson?.birthPlace,
      deathYear,
      treePerson?.deathPlace,
      `${firstName} ${lastName}`,
    ),
    person: mapWikiTreePerson(m),
  }));
}
