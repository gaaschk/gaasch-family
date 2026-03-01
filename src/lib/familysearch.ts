/**
 * FamilySearch API client
 * Docs: https://www.familysearch.org/developers/docs/api/
 */
import { prisma } from './prisma';
import { getSystemSetting } from './settings';
import { searchWikiTree } from './wikitree';
import { getGeniAccessToken, searchGeni } from './geni';

const IS_SANDBOX = process.env.FAMILYSEARCH_ENV === 'sandbox';

export const FS_API   = IS_SANDBOX ? 'https://beta.familysearch.org' : 'https://api.familysearch.org';
const FS_AUTH_BASE    = IS_SANDBOX ? 'https://identbeta.familysearch.org' : 'https://ident.familysearch.org';
const FS_TOKEN_URL    = `${FS_AUTH_BASE}/cis-web/oauth2/v3/token`;
const FS_AUTH_URL     = `${FS_AUTH_BASE}/cis-web/oauth2/v3/authorization`;

function redirectUri() {
  return `${process.env.AUTH_URL}/api/auth/familysearch/callback`;
}

// ── OAuth ──────────────────────────────────────────────────────────────────

export async function getFsAuthUrl(state: string) {
  const clientId = await getSystemSetting('fs_client_id', 'FAMILYSEARCH_CLIENT_ID');
  const p = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri(),
    scope:         'openid profile',
    state,
  });
  return `${FS_AUTH_URL}?${p}`;
}

export async function exchangeCode(code: string) {
  const [clientId, clientSecret] = await Promise.all([
    getSystemSetting('fs_client_id', 'FAMILYSEARCH_CLIENT_ID'),
    getSystemSetting('fs_client_secret', 'FAMILYSEARCH_CLIENT_SECRET'),
  ]);
  const res = await fetch(FS_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri(),
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  }>;
}

async function doRefresh(refreshToken: string) {
  const [clientId, clientSecret] = await Promise.all([
    getSystemSetting('fs_client_id', 'FAMILYSEARCH_CLIENT_ID'),
    getSystemSetting('fs_client_secret', 'FAMILYSEARCH_CLIENT_SECRET'),
  ]);
  const res = await fetch(FS_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

// ── Token management ────────────────────────────────────────────────────────

/** Returns a valid access token for the user, refreshing if needed. */
export async function getAccessToken(userId: string): Promise<string | null> {
  const record = await prisma.familySearchToken.findUnique({ where: { userId } });
  if (!record) return null;

  // If token expires in more than 5 min, use it
  if (record.expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return record.accessToken;
  }

  // Try to refresh
  if (!record.refreshToken) return null;
  try {
    const tokens = await doRefresh(record.refreshToken);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await prisma.familySearchToken.update({
      where: { userId },
      data: {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token ?? record.refreshToken,
        expiresAt,
        updatedAt: new Date(),
      },
    });
    return tokens.access_token;
  } catch {
    return null;
  }
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function fsGet<T = unknown>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${FS_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept:        'application/x-fs-v1+json',
    },
  });
  if (res.status === 401) throw new Error('FamilySearch token expired or invalid');
  if (!res.ok) throw new Error(`FamilySearch API error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// ── Data mappers ───────────────────────────────────────────────────────────

const FS_BIRTH      = 'http://gedcomx.org/Birth';
const FS_DEATH      = 'http://gedcomx.org/Death';
const FS_BURIAL     = 'http://gedcomx.org/Burial';
const FS_OCCUPATION = 'http://gedcomx.org/Occupation';
const FS_MALE       = 'http://gedcomx.org/Male';
const FS_FEMALE     = 'http://gedcomx.org/Female';

interface FsPerson {
  id: string;
  names?: { nameForms?: { fullText?: string }[] }[];
  gender?: { type?: string };
  facts?: {
    type?: string;
    date?:  { original?: string };
    place?: { original?: string };
    value?: string;
  }[];
}

export interface FsPersonSummary {
  pid:        string;
  name:       string;
  sex:        string | null;
  birthDate:  string | null;
  birthPlace: string | null;
  deathDate:  string | null;
  deathPlace: string | null;
  burialDate: string | null;
  burialPlace: string | null;
  occupation: string | null;
}

export function mapFsPerson(p: FsPerson): FsPersonSummary {
  const name  = p.names?.[0]?.nameForms?.[0]?.fullText ?? '(unknown)';
  const facts = p.facts ?? [];
  const birth  = facts.find(f => f.type === FS_BIRTH);
  const death  = facts.find(f => f.type === FS_DEATH);
  const burial = facts.find(f => f.type === FS_BURIAL);
  const occ    = facts.find(f => f.type === FS_OCCUPATION);
  const gender = p.gender?.type;
  return {
    pid:        p.id,
    name,
    sex:        gender === FS_MALE ? 'M' : gender === FS_FEMALE ? 'F' : null,
    birthDate:  birth?.date?.original  ?? null,
    birthPlace: birth?.place?.original ?? null,
    deathDate:  death?.date?.original  ?? null,
    deathPlace: death?.place?.original ?? null,
    burialDate: burial?.date?.original ?? null,
    burialPlace: burial?.place?.original ?? null,
    occupation: occ?.value ?? null,
  };
}

// ── Background match search ────────────────────────────────────────────────

async function storeMatches(
  source:   string,
  personId: string,
  treeId:   string,
  entries:  FsSearchEntry[],
): Promise<void> {
  for (const e of entries) {
    await prisma.familySearchMatch.upsert({
      where:  { personId_source_fsPid: { personId, source, fsPid: e.id } },
      update: { score: e.score, fsData: JSON.stringify(e.person) },
      create: { personId, treeId, source, fsPid: e.id, score: e.score, fsData: JSON.stringify(e.person) },
    });
  }
}

/**
 * Search all configured sources (FamilySearch, WikiTree, Geni) for a person
 * and store potential matches. Sources are queried in parallel.
 * Silently no-ops if the person doesn't exist.
 */
export async function searchAndStoreMatches(
  personId: string,
  treeId:   string,
  userId:   string,
): Promise<void> {
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return;

  const cleanName = person.name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
  if (!cleanName) return;

  const [first, ...rest] = cleanName.split(' ');
  const last = rest.join(' ');
  const birthYear = person.birthDate?.match(/\d{4}/)?.[0]
    ? parseInt(person.birthDate!.match(/\d{4}/)![0], 10)
    : undefined;

  const [fsToken, geniToken] = await Promise.all([
    getAccessToken(userId),
    getGeniAccessToken(userId),
  ]);

  await Promise.allSettled([
    // FamilySearch (requires connection)
    fsToken
      ? searchFamilySearch(fsToken, cleanName, 5)
          .then(r => storeMatches('familysearch', personId, treeId, r))
      : Promise.resolve(),

    // WikiTree (always available — no auth)
    searchWikiTree(first, last, birthYear, 5, {
      birthPlace: person.birthPlace,
      deathDate:  person.deathDate,
      deathPlace: person.deathPlace,
    }).then(r => storeMatches('wikitree', personId, treeId, r)),

    // Geni (requires connection)
    geniToken
      ? searchGeni(geniToken, cleanName, 5)
          .then(r => storeMatches('geni', personId, treeId, r))
      : Promise.resolve(),
  ]);
}

// ── Search ─────────────────────────────────────────────────────────────────

export interface FsSearchEntry {
  id:    string;          // FamilySearch PID
  score: number;
  person: FsPersonSummary;
}

interface FsSearchResult {
  entries?: {
    id: string;
    score: number;
    content?: { gedcomx?: { persons?: FsPerson[] } };
  }[];
}

export async function searchFamilySearch(
  accessToken: string,
  query: string,
  count = 10,
): Promise<FsSearchEntry[]> {
  const params = new URLSearchParams({ 'q.name': query, count: String(count) });
  const data = await fsGet<FsSearchResult>(`/platform/tree/search?${params}`, accessToken);
  return (data.entries ?? []).map(e => ({
    id:     e.id,
    score:  e.score,
    person: mapFsPerson(e.content?.gedcomx?.persons?.[0] ?? { id: e.id }),
  }));
}

// ── Ancestry (pedigree) ────────────────────────────────────────────────────

interface FsAncestryResult {
  persons?: (FsPerson & { display?: { ascendancyNumber?: string } })[];
}

export async function fetchAncestry(
  accessToken: string,
  pid: string,
  generations = 4,
): Promise<FsPersonSummary[]> {
  const params = new URLSearchParams({ person: pid, generations: String(generations) });
  const data = await fsGet<FsAncestryResult>(`/platform/tree/ancestry?${params}`, accessToken);
  return (data.persons ?? []).map(p => mapFsPerson(p));
}

// ── Relationships (for building families) ─────────────────────────────────

interface FsRelResult {
  relationships?: {
    type?: string;
    person1?: { resourceId?: string };
    person2?: { resourceId?: string };
    facts?: { type?: string; date?: { original?: string }; place?: { original?: string } }[];
  }[];
}

interface FsParentsResult {
  childAndParentsRelationships?: {
    parent1?: { resourceId?: string };
    parent2?: { resourceId?: string };
    child?:   { resourceId?: string };
    facts?:   unknown[];
  }[];
  persons?: FsPerson[];
}

export async function fetchParentRelationships(
  accessToken: string,
  pid: string,
): Promise<{ fatherId: string | null; motherId: string | null }> {
  try {
    const data = await fsGet<FsParentsResult>(
      `/platform/tree/persons/${pid}/parents`,
      accessToken,
    );
    const rel = data.childAndParentsRelationships?.[0];
    if (!rel) return { fatherId: null, motherId: null };
    return {
      fatherId: rel.parent1?.resourceId ?? null,
      motherId: rel.parent2?.resourceId ?? null,
    };
  } catch {
    return { fatherId: null, motherId: null };
  }
}

export async function fetchSpouseRelationships(
  accessToken: string,
  pid: string,
): Promise<{
  spouseId: string | null;
  marrDate: string | null;
  marrPlace: string | null;
}[]> {
  try {
    const data = await fsGet<FsRelResult>(
      `/platform/tree/persons/${pid}/spouses`,
      accessToken,
    );
    return (data.relationships ?? []).map(r => {
      const marrFact = r.facts?.find(f => f.type === 'http://gedcomx.org/Marriage');
      const spouseId = r.person1?.resourceId === pid
        ? (r.person2?.resourceId ?? null)
        : (r.person1?.resourceId ?? null);
      return {
        spouseId,
        marrDate:  marrFact?.date?.original  ?? null,
        marrPlace: marrFact?.place?.original ?? null,
      };
    });
  } catch {
    return [];
  }
}
