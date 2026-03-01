/**
 * Geni API client (OAuth2)
 * https://www.geni.com/platform/developer/help/api
 */
import { prisma } from './prisma';
import { getSystemSetting } from './settings';
import type { FsPersonSummary, FsSearchEntry } from './familysearch';

const GENI_AUTH_URL  = 'https://www.geni.com/platform/oauth/authorize';
const GENI_TOKEN_URL = 'https://www.geni.com/platform/oauth/request_token'; // Geni-specific endpoint
const GENI_API_BASE  = 'https://www.geni.com/api';

function redirectUri() {
  return `${process.env.AUTH_URL}/api/auth/geni/callback`;
}

// ── OAuth ──────────────────────────────────────────────────────────────────

export async function getGeniAuthUrl(state: string): Promise<string> {
  const clientId = await getSystemSetting('geni_client_id');
  const p = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri(),
    state,
  });
  return `${GENI_AUTH_URL}?${p}`;
}

export async function exchangeGeniCode(code: string) {
  const [clientId, clientSecret] = await Promise.all([
    getSystemSetting('geni_client_id'),
    getSystemSetting('geni_client_secret'),
  ]);
  const res = await fetch(GENI_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri(),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Geni token exchange failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<{
    access_token:  string;
    refresh_token?: string;
    expires_in:    number;
  }>;
}

async function doGeniRefresh(refreshToken: string) {
  const [clientId, clientSecret] = await Promise.all([
    getSystemSetting('geni_client_id'),
    getSystemSetting('geni_client_secret'),
  ]);
  const res = await fetch(GENI_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Geni token refresh failed: ${res.status}`);
  return res.json() as Promise<{
    access_token:  string;
    refresh_token?: string;
    expires_in:    number;
  }>;
}

// ── Token management ────────────────────────────────────────────────────────

/** Returns a valid access token for the user, refreshing if needed. */
export async function getGeniAccessToken(userId: string): Promise<string | null> {
  const record = await prisma.geniToken.findUnique({ where: { userId } });
  if (!record) return null;

  if (record.expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return record.accessToken;
  }

  if (!record.refreshToken) return null;
  try {
    const tokens = await doGeniRefresh(record.refreshToken);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await prisma.geniToken.update({
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

async function geniGet<T = unknown>(path: string, accessToken: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${GENI_API_BASE}${path}${sep}access_token=${accessToken}`);
  if (res.status === 401) throw new Error('Geni token expired or invalid');
  if (!res.ok) throw new Error(`Geni API error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// ── Data mappers ───────────────────────────────────────────────────────────

interface GeniProfile {
  id:     string;
  names?: { en?: { first_name?: string; last_name?: string } };
  events?: {
    birth?: {
      date?:     { year?: number; month?: number; day?: number };
      location?: { place_name?: string };
    };
    death?: {
      date?:     { year?: number; month?: number; day?: number };
      location?: { place_name?: string };
    };
  };
  gender?: string; // "male" | "female"
}

interface GeniSearchResult {
  results?: GeniProfile[];
}

function formatGeniDate(d?: { year?: number; month?: number; day?: number }): string | null {
  if (!d?.year) return null;
  const parts = [String(d.year)];
  if (d.month) parts.push(String(d.month).padStart(2, '0'));
  if (d.day)   parts.push(String(d.day).padStart(2, '0'));
  return parts.join('-');
}

function mapGeniProfile(p: GeniProfile): FsPersonSummary {
  const firstName = p.names?.en?.first_name ?? '';
  const lastName  = p.names?.en?.last_name  ?? '';
  return {
    pid:        p.id,
    name:       [firstName, lastName].filter(Boolean).join(' ') || p.id,
    sex:        p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : null,
    birthDate:  formatGeniDate(p.events?.birth?.date),
    birthPlace: p.events?.birth?.location?.place_name ?? null,
    deathDate:  formatGeniDate(p.events?.death?.date),
    deathPlace: p.events?.death?.location?.place_name ?? null,
    burialDate:  null,
    burialPlace: null,
    occupation:  null,
  };
}

// ── Search ─────────────────────────────────────────────────────────────────

export async function searchGeni(
  accessToken: string,
  query: string,
  count = 10,
): Promise<FsSearchEntry[]> {
  const params = new URLSearchParams({ q: query, per_page: String(count) });
  const data = await geniGet<GeniSearchResult>(`/search?${params}`, accessToken);
  const results = data.results ?? [];

  // Assign descending scores (Geni returns results in relevance order but no score)
  return results.map((p, i) => ({
    id:     p.id,
    score:  Math.max(80 - i * 5, 40),
    person: mapGeniProfile(p),
  }));
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function getGeniProfile(accessToken: string): Promise<{ id: string; displayName: string | null }> {
  const p = await geniGet<GeniProfile>('/profile', accessToken);
  const firstName = p.names?.en?.first_name ?? '';
  const lastName  = p.names?.en?.last_name  ?? '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || null;
  return { id: p.id, displayName };
}
