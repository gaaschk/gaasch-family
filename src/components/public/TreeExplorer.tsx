'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Person } from '@/types';
import ChatPanel from './ChatPanel';

// ── Record match types ────────────────────────────────────────────────────
interface FsMatch {
  id:      string;
  fsPid:   string;
  source:  string;
  score:   number;
  fsData:  string; // JSON: FsPersonSummary
  status:  string;
}

const REVIEW_FIELDS = [
  { key: 'birthDate',  label: 'Birth date' },
  { key: 'birthPlace', label: 'Birth place' },
  { key: 'deathDate',  label: 'Death date' },
  { key: 'deathPlace', label: 'Death place' },
  { key: 'occupation', label: 'Occupation' },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  familysearch: 'FamilySearch',
  wikitree:     'WikiTree',
  geni:         'Geni',
};
const SOURCE_COLORS: Record<string, string> = {
  familysearch: '#4a7c59',
  wikitree:     '#5b7fa6',
  geni:         '#8c5c9e',
};

interface FsPersonData {
  pid:         string;
  name:        string;
  sex:         string | null;
  birthDate:   string | null;
  birthPlace:  string | null;
  deathDate:   string | null;
  deathPlace:  string | null;
  occupation:  string | null;
}

// ── Types from the enriched API response ─────────────────────────────────
interface PersonRelation {
  id: string;
  name: string;
  sex: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  occupation: string | null;
}

interface PathNode {
  id: string;
  name: string;
}

interface PersonFull extends PersonRelation {
  narrative: string | null;
  pathToRoot?: PathNode[];
  // childIn: families where person is a child → gives parents
  childIn: {
    familyId: string;
    family: {
      id: string;
      husband: PersonRelation | null;
      wife: PersonRelation | null;
    };
  }[];
  // asHusband/asWife: families where person is a spouse → gives spouses + children
  asHusband: {
    id: string;
    wife: PersonRelation | null;
    children: { personId: string; person: PersonRelation }[];
  }[];
  asWife: {
    id: string;
    husband: PersonRelation | null;
    children: { personId: string; person: PersonRelation }[];
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────
function cleanName(name: string) {
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

function formatLifespan(p: PersonRelation) {
  const b = p.birthDate?.replace(/^ABT |^BEF |^AFT |^BET .* AND /i, '') ?? '';
  const d = p.deathDate?.replace(/^ABT |^BEF |^AFT |^BET .* AND /i, '') ?? '';
  if (b && d) return `${b} – ${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return '';
}

function shortPlace(place: string | null) {
  if (!place) return '';
  return place.split(',').slice(-2).join(',').trim();
}

function deriveRelations(p: PersonFull) {
  const parents: PersonRelation[] = [];
  const seenParents = new Set<string>();
  for (const fc of p.childIn) {
    for (const parent of [fc.family.husband, fc.family.wife]) {
      if (parent && !seenParents.has(parent.id)) {
        seenParents.add(parent.id);
        parents.push(parent);
      }
    }
  }

  const spouses: PersonRelation[] = [];
  const seenSpouses = new Set<string>();
  for (const f of [...p.asHusband, ...p.asWife]) {
    const s = 'wife' in f ? (f as { wife: PersonRelation | null }).wife
                          : (f as { husband: PersonRelation | null }).husband;
    if (s && !seenSpouses.has(s.id)) {
      seenSpouses.add(s.id);
      spouses.push(s);
    }
  }

  const children: PersonRelation[] = [];
  const seenChildren = new Set<string>();
  for (const f of [...p.asHusband, ...p.asWife]) {
    for (const fc of f.children) {
      if (!seenChildren.has(fc.personId)) {
        seenChildren.add(fc.personId);
        children.push(fc.person);
      }
    }
  }

  return { parents, spouses, children };
}

type ExplorerView = 'fan' | 'pedigree' | 'family';

// Deterministic pseudo-random citizenship status based on person id
function getCitizenshipStatus(id: string): 'green' | 'amber' | 'red' {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const n = Math.abs(hash) % 3;
  return n === 0 ? 'green' : n === 1 ? 'amber' : 'red';
}

// ── Main component ────────────────────────────────────────────────────────
export default function TreeExplorer({
  treeSlug,
  treeName,
  initialPerson,
  role,
  defaultPersonId,
  userId,
  hasFsConnection,
  externalPersonId,
}: {
  treeSlug: string;
  treeName?: string;
  initialPerson?: PersonFull;
  role?: string;
  defaultPersonId?: string;
  userId?: string;
  hasFsConnection?: boolean;
  externalPersonId?: string;
}) {
  const [currentId, setCurrentId] = useState<string | null>(initialPerson?.id ?? null);
  const [person, setPerson] = useState<PersonFull | null>(initialPerson ?? null);
  const [loading, setLoading] = useState(!initialPerson);
  const [pathToRoot, setPathToRoot] = useState<PathNode[]>([]);
  const cache = useRef<Map<string, PersonFull>>(new Map());

  // Explorer view state
  const [activeView, setActiveView] = useState<ExplorerView>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('heirloom:explorerView') as ExplorerView) || 'pedigree';
    }
    return 'pedigree';
  });
  const [citizenshipMode, setCitizenshipMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'details' | 'narrative' | 'docs'>('details');

  // Narrative generation
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [streamedNarrative, setStreamedNarrative] = useState('');

  // FamilySearch hints
  const [fsMatches, setFsMatches]     = useState<FsMatch[]>([]);
  const [fsOpen, setFsOpen]           = useState(false);
  const [fsActing, setFsActing]       = useState<string | null>(null);
  const [fsActionError, setFsActionError] = useState('');
  const [fsSearchMsg, setFsSearchMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fsSearchMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reviewMatchId, setReviewMatchId] = useState<string | null>(null);
  const [reviewFields, setReviewFields]   = useState<Set<string>>(new Set());

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const lsKey = `tree:${treeSlug}:${userId ?? 'anon'}:lastPerson`;

  // Persist view preference
  useEffect(() => {
    localStorage.setItem('heirloom:explorerView', activeView);
  }, [activeView]);

  const navigateTo = useCallback(async (id: string) => {
    localStorage.setItem(`tree:${treeSlug}:lastPerson`, id);
    if (cache.current.has(id)) {
      const cached = cache.current.get(id)!;
      setPerson(cached);
      setCurrentId(id);
      if (cached.pathToRoot) setPathToRoot(cached.pathToRoot);
      setSidebarOpen(true);
      setSidebarTab('details');
      setStreamedNarrative('');
      localStorage.setItem('lastViewed', JSON.stringify({
        treeSlug, treeName: treeName ?? treeSlug, personId: id, personName: cleanName(cached.name),
      }));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data: PersonFull = await res.json();
        cache.current.set(id, data);
        setPerson(data);
        setCurrentId(id);
        setPathToRoot(data.pathToRoot ?? []);
        setSidebarOpen(true);
        setSidebarTab('details');
        setStreamedNarrative('');
        localStorage.setItem('lastViewed', JSON.stringify({
          treeSlug, treeName: treeName ?? treeSlug, personId: id, personName: cleanName(data.name),
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [treeSlug, treeName, lsKey]);

  // On mount: restore last-viewed person, else default person, else first alphabetically
  useEffect(() => {
    if (initialPerson) {
      cache.current.set(initialPerson.id, initialPerson);
      setCurrentId(initialPerson.id);
      setPathToRoot(initialPerson.pathToRoot ?? []);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const saved = localStorage.getItem(lsKey);
        const startId = saved || defaultPersonId;
        if (startId) {
          await navigateTo(startId);
        } else {
          const listRes = await fetch(`/api/trees/${treeSlug}/people?limit=1`);
          if (listRes.ok) {
            const listData = await listRes.json();
            const first: Person | undefined = listData.data?.[0];
            if (first) await navigateTo(first.id);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [initialPerson, treeSlug, navigateTo, defaultPersonId, lsKey]);

  // Store fetched person in cache
  useEffect(() => {
    if (person) cache.current.set(person.id, person);
  }, [person]);

  // Fetch FamilySearch hints when person changes
  useEffect(() => {
    setFsMatches([]);
    setFsOpen(false);
    setFsSearchMsg(null);
    setReviewMatchId(null);
    setReviewFields(new Set());
    if (fsSearchMsgTimer.current) clearTimeout(fsSearchMsgTimer.current);
    if (!currentId || (role !== 'editor' && role !== 'admin')) return;
    fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(currentId)}/fs-matches`)
      .then(r => r.ok ? r.json() : { matches: [] })
      .then((d: { matches: FsMatch[] }) => setFsMatches(d.matches ?? []))
      .catch(() => {});
  }, [currentId, treeSlug, role]);

  // Navigate to externally-selected person (from directory clicks)
  useEffect(() => {
    if (externalPersonId) navigateTo(externalPersonId);
  }, [externalPersonId, navigateTo]);

  function handleSearch(q: string) {
    setQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q.trim()) { setShowResults(false); return; }
    searchDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/trees/${treeSlug}/people?q=${encodeURIComponent(q)}&limit=12`);
      const data = await res.json();
      setSearchResults(data.data ?? []);
      setShowResults(true);
    }, 200);
  }

  function selectSearchResult(p: Person) {
    setQuery('');
    setShowResults(false);
    navigateTo(p.id);
  }

  async function handleFsAction(
    matchId: string,
    action: 'accept' | 'reject',
    fieldUpdates?: Record<string, string>,
  ) {
    setFsActing(matchId);
    setFsActionError('');
    try {
      const res = await fetch(
        `/api/trees/${treeSlug}/people/${encodeURIComponent(currentId!)}/fs-matches/${matchId}`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action, fieldUpdates }),
        },
      );
      if (res.ok) {
        const data = await res.json() as { person?: PersonFull };
        setFsMatches(prev => prev.filter(m => m.id !== matchId));
        setReviewMatchId(null);
        if (data.person && currentId) await navigateTo(currentId);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setFsActionError(data.error ?? `Action failed (${res.status})`);
      }
    } finally {
      setFsActing(null);
    }
  }

  function startReview(match: FsMatch) {
    const fs = JSON.parse(match.fsData) as FsPersonData;
    const auto = new Set<string>();
    for (const { key } of REVIEW_FIELDS) {
      const srcVal = fs[key as keyof FsPersonData] as string | null | undefined;
      const localVal = person ? (person as unknown as Record<string, unknown>)[key] as string | null | undefined : null;
      if (srcVal && srcVal !== localVal) auto.add(key);
    }
    setReviewFields(auto);
    setReviewMatchId(match.id);
  }

  function showSearchMsg(text: string, ok: boolean) {
    setFsSearchMsg({ text, ok });
    if (fsSearchMsgTimer.current) clearTimeout(fsSearchMsgTimer.current);
    fsSearchMsgTimer.current = setTimeout(() => setFsSearchMsg(null), 5000);
  }

  async function handleFsSearch() {
    if (!currentId) return;
    setFsActing('search');
    setFsSearchMsg(null);
    try {
      const res = await fetch(
        `/api/trees/${treeSlug}/people/${encodeURIComponent(currentId)}/fs-matches`,
        { method: 'POST' },
      );
      if (res.ok) {
        const data = await res.json() as { matches: FsMatch[] };
        const matches = data.matches ?? [];
        setFsMatches(matches);
        if (matches.length > 0) {
          setFsOpen(true);
          showSearchMsg(`Found ${matches.length} record ${matches.length === 1 ? 'hint' : 'hints'}`, true);
        } else {
          showSearchMsg('No matches found', false);
        }
      } else {
        showSearchMsg('Search failed — please try again', false);
      }
    } catch {
      showSearchMsg('Search failed — please try again', false);
    } finally {
      setFsActing(null);
    }
  }

  async function handleGenerateNarrative() {
    if (!currentId || !person) return;
    setGeneratingNarrative(true);
    setStreamedNarrative('');
    try {
      const res = await fetch(
        `/api/trees/${treeSlug}/people/${encodeURIComponent(currentId)}/generate-narrative`,
        { method: 'POST' },
      );
      if (!res.ok || !res.body) {
        setGeneratingNarrative(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setStreamedNarrative(full);
      }
      // Update cache with new narrative
      const updated = { ...person, narrative: full };
      cache.current.set(person.id, updated);
      setPerson(updated);
    } finally {
      setGeneratingNarrative(false);
    }
  }

  const canEdit = role === 'editor' || role === 'admin';

  // ── Derived data ──
  const relations = person ? deriveRelations(person) : { parents: [], spouses: [], children: [] };
  const nameClean = person ? cleanName(person.name) : '';
  const initials = nameClean.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const lifespan = person ? formatLifespan(person) : '';

  // Build lifespan string for sidebar
  const sidebarDates = person ? [
    person.birthDate ? `b. ${person.birthDate}` : null,
    person.birthPlace ? shortPlace(person.birthPlace) : null,
    person.deathDate ? `d. ${person.deathDate}` : null,
  ].filter(Boolean).join(' · ') : '';

  // ── Render ──────────────────────────────────────────────────────────────
  if (!person && loading) {
    return (
      <div className="explorer-body">
        <div className="explorer-canvas">
          <div style={{ padding: '4rem', color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="explorer-body">
        <div className="explorer-canvas">
          <div className="explorer-toolbar">
            <div className="view-switcher">
              <button className="view-btn">Fan</button>
              <button className="view-btn active">Pedigree</button>
              <button className="view-btn">Family</button>
            </div>
          </div>
          <div className="explorer-canvas-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--heirloom-ink-muted)', padding: '3rem 2rem', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--heirloom-ink)', fontWeight: 600 }}>
                This tree has no people yet.
              </p>
              {canEdit ? (
                <>
                  <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                    Add your first person to get started.
                  </p>
                  <a
                    href={`/trees/${treeSlug}/admin/people/new`}
                    style={{
                      display: 'inline-block', padding: '8px 20px', background: 'var(--brand)',
                      color: 'white', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                    }}
                  >
                    Add a person
                  </a>
                </>
              ) : (
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                  Check back later — the tree administrator hasn&apos;t added anyone yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { parents, spouses, children } = relations;
  const firstName = nameClean.split(' ')[0];
  const parentSlot = person.sex === 'F' ? 'wifeId' : 'husbId';
  const familyNewBase = `/trees/${treeSlug}/admin/families/new`;
  const parentAddHref  = canEdit ? `${familyNewBase}?childId=${person.id}` : undefined;
  const childAddHref   = canEdit ? `${familyNewBase}?${parentSlot}=${person.id}` : undefined;
  const spouseAddHref  = canEdit ? `${familyNewBase}?${parentSlot}=${person.id}` : undefined;

  // Narrative display: show streamed content while generating, else person.narrative
  const narrativeHtml = generatingNarrative ? streamedNarrative : (person.narrative ?? '');

  return (
    <div className="explorer-body">
      {/* ══ LEFT SIDEBAR ══ */}
      <div className={`explorer-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        {person && sidebarOpen && (
          <>
            <div className="sidebar-top">
              <div className="sidebar-person-header">
                <div className="sidebar-avatar">{initials}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="sidebar-name">{nameClean}</div>
                  <div className="sidebar-dates">{sidebarDates}</div>
                </div>
                <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
              </div>
              <div className="sidebar-tabs">
                <button
                  className={`sidebar-tab${sidebarTab === 'details' ? ' active' : ''}`}
                  onClick={() => setSidebarTab('details')}
                >
                  Details
                </button>
                <button
                  className={`sidebar-tab${sidebarTab === 'narrative' ? ' active' : ''}`}
                  onClick={() => setSidebarTab('narrative')}
                >
                  Narrative
                </button>
                <button
                  className={`sidebar-tab${sidebarTab === 'docs' ? ' active' : ''}`}
                  onClick={() => setSidebarTab('docs')}
                >
                  Docs
                </button>
              </div>
            </div>

            <div className="sidebar-body">
              {/* ── Details tab ── */}
              {sidebarTab === 'details' && (
                <div>
                  {person.birthPlace && (
                    <div className="sidebar-info-row">
                      <div className="sidebar-info-icon">📍</div>
                      <div>
                        <div className="sidebar-info-text">{person.birthPlace}</div>
                        <div className="sidebar-info-label">Birthplace</div>
                      </div>
                    </div>
                  )}
                  {person.birthDate && (
                    <div className="sidebar-info-row">
                      <div className="sidebar-info-icon">📅</div>
                      <div>
                        <div className="sidebar-info-text">{person.birthDate}</div>
                        <div className="sidebar-info-label">Born</div>
                      </div>
                    </div>
                  )}
                  {(person.deathDate || person.deathPlace) && (
                    <div className="sidebar-info-row">
                      <div className="sidebar-info-icon">✝</div>
                      <div>
                        <div className="sidebar-info-text">
                          {[person.deathDate, person.deathPlace].filter(Boolean).join(', ')}
                        </div>
                        <div className="sidebar-info-label">Death</div>
                      </div>
                    </div>
                  )}
                  {person.occupation && (
                    <div className="sidebar-info-row">
                      <div className="sidebar-info-icon">👔</div>
                      <div>
                        <div className="sidebar-info-text">{person.occupation}</div>
                        <div className="sidebar-info-label">Occupation</div>
                      </div>
                    </div>
                  )}

                  {/* Parents */}
                  {parents.length > 0 && (
                    <>
                      <div className="sidebar-section-title">Parents</div>
                      <div className="sidebar-rel-chips">
                        {parents.map(p => (
                          <button key={p.id} className="sidebar-rel-chip" onClick={() => navigateTo(p.id)}>
                            {cleanName(p.name)} <span className="sidebar-rel-chip-label">{p.sex === 'F' ? 'mother' : 'father'}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Spouses */}
                  {spouses.length > 0 && (
                    <>
                      <div className="sidebar-section-title">Spouses</div>
                      <div className="sidebar-rel-chips">
                        {spouses.map(s => (
                          <button key={s.id} className="sidebar-rel-chip" onClick={() => navigateTo(s.id)}>
                            {cleanName(s.name)} <span className="sidebar-rel-chip-label">spouse</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Children */}
                  {children.length > 0 && (
                    <>
                      <div className="sidebar-section-title">Children</div>
                      <div className="sidebar-rel-chips">
                        {children.map(c => (
                          <button key={c.id} className="sidebar-rel-chip" onClick={() => navigateTo(c.id)}>
                            {cleanName(c.name)} <span className="sidebar-rel-chip-label">{c.sex === 'F' ? 'daughter' : 'son'}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Record hints (for editors) */}
                  {canEdit && fsMatches.length > 0 && (
                    <>
                      <div className="sidebar-section-title">Record Hints</div>
                      <button
                        onClick={() => setFsOpen(o => !o)}
                        style={{
                          background: '#f0ebe3', border: '1px solid var(--heirloom-border)',
                          borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
                          color: 'var(--brand)', fontWeight: 500,
                          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                        }}
                      >
                        {fsMatches.length} record {fsMatches.length === 1 ? 'hint' : 'hints'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── Narrative tab ── */}
              {sidebarTab === 'narrative' && (
                <div>
                  {canEdit && (
                    <button
                      className="sidebar-generate-btn"
                      onClick={handleGenerateNarrative}
                      disabled={generatingNarrative}
                    >
                      {generatingNarrative ? 'Generating…' : narrativeHtml ? '🔄 Regenerate narrative' : '✨ Generate narrative'}
                    </button>
                  )}
                  {narrativeHtml ? (
                    <div className="sidebar-narrative-text" dangerouslySetInnerHTML={{ __html: narrativeHtml }} />
                  ) : (
                    <p style={{ fontSize: 13, color: '#9a8a7a', fontStyle: 'italic' }}>
                      No narrative generated yet.{canEdit ? ' Click the button above to generate one.' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* ── Docs tab ── */}
              {sidebarTab === 'docs' && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                  <p style={{ fontSize: 14, color: 'var(--heirloom-ink)', fontWeight: 500, marginBottom: 8, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    Documents feature coming soon
                  </p>
                  <p style={{ fontSize: 12, color: '#9a8a7a', lineHeight: 1.6, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    Track citizenship documents, certificates, and other records for each person.
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar footer */}
            {canEdit && (
              <div className="sidebar-footer">
                <a
                  href={`/trees/${treeSlug}/admin/people/${encodeURIComponent(person.id)}/edit`}
                  className="sidebar-btn sidebar-btn-primary"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                  Edit Person
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ TREE CANVAS ══ */}
      <div className="explorer-canvas">
        {/* ── Toolbar ── */}
        <div className="explorer-toolbar">
          <div className="view-switcher">
            <button
              className={`view-btn${activeView === 'fan' ? ' active' : ''}`}
              onClick={() => setActiveView('fan')}
            >
              Fan
            </button>
            <button
              className={`view-btn${activeView === 'pedigree' ? ' active' : ''}`}
              onClick={() => setActiveView('pedigree')}
            >
              Pedigree
            </button>
            <button
              className={`view-btn${activeView === 'family' ? ' active' : ''}`}
              onClick={() => setActiveView('family')}
            >
              Family
            </button>
          </div>

          <div className="toolbar-sep" />

          <div className="citizenship-toggle" onClick={() => setCitizenshipMode(m => !m)}>
            <div className={`toggle-track${citizenshipMode ? ' on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
            <span>Citizenship mode</span>
          </div>

          <div className="toolbar-right">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                ref={searchRef}
                type="text"
                placeholder="Search people…"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
                autoComplete="off"
                style={{
                  padding: '5px 10px', fontSize: 13, border: '1px solid var(--heirloom-border)',
                  borderRadius: 6, outline: 'none', width: 180,
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                }}
              />
              {showResults && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                  border: '1px solid var(--heirloom-border)', borderTop: 'none', borderRadius: '0 0 6px 6px',
                  maxHeight: 300, overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}>
                  {searchResults.length === 0 ? (
                    <div style={{ padding: '8px 10px', color: '#9a8a7a', fontSize: 12, fontStyle: 'italic' }}>
                      No results for &ldquo;{query}&rdquo;
                    </div>
                  ) : (
                    searchResults.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => selectSearchResult(p)}
                        tabIndex={0}
                        style={{
                          padding: '6px 10px', cursor: 'pointer', fontSize: 13,
                          borderBottom: '1px solid #f0ebe3',
                          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                        }}
                      >
                        <strong>{cleanName(p.name)}</strong>
                        {formatLifespan(p) && (
                          <span style={{ color: '#9a8a7a', fontSize: 11, marginLeft: 6 }}>{formatLifespan(p)}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* FamilySearch search button (editors) */}
            {canEdit && (
              <button
                className="explorer-icon-btn"
                onClick={handleFsSearch}
                disabled={fsActing === 'search'}
                title="Search external sources"
                style={{ fontSize: 14, opacity: fsActing === 'search' ? 0.5 : 1 }}
              >
                🔍
              </button>
            )}
          </div>
        </div>

        {/* ── Canvas area ── */}
        <div className="explorer-canvas-area">
          {/* Pedigree view — the original explorer content */}
          {activeView === 'pedigree' && (
            <div className="explorer-content">
              <section id="chapters" className="chapters-section">
                {/* Lineage sidebar */}
                {pathToRoot.length > 0 && (
                  <nav className="chapters-timeline" aria-label="Lineage path">
                    <div className="timeline-crumb">
                      {pathToRoot.map((node, i) => {
                        const isActive = node.id === currentId;
                        return (
                          <div key={node.id}>
                            <button
                              className={`crumb-node${isActive ? ' crumb-node--active' : ''}`}
                              onClick={() => navigateTo(node.id)}
                            >
                              <span className="crumb-dot" />
                              <span className="crumb-text">
                                <span className="crumb-name">
                                  {node.name.replace(/\//g, '').replace(/\s+/g, ' ').trim()}
                                </span>
                              </span>
                            </button>
                            {i < pathToRoot.length - 1 && (
                              <span className="crumb-arrow">↓</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Read story link */}
                    <div style={{ padding: '1rem 0.75rem 0.75rem' }}>
                      <a
                        href={`/trees/${treeSlug}/stories/${encodeURIComponent(pathToRoot[pathToRoot.length - 1].id)}`}
                        className="story-cta-link"
                        style={{ display: 'block', textAlign: 'center' }}
                      >
                        Read story &rarr;
                      </a>
                    </div>
                  </nav>
                )}

                {/* Main chapter area */}
                <div className="chapters-main">
                  {/* Full-width chapter header */}
                  {!loading && (
                    <div className="chapter-header">
                      <div className="chapter-header-grid">
                        <div />
                        <div style={{ textAlign: 'center' }}>
                          {canEdit && (
                            <a
                              href={`/trees/${treeSlug}/admin/people/${encodeURIComponent(person.id)}/edit`}
                              style={{
                                display: 'inline-block', marginBottom: '0.75rem', fontSize: 12,
                                color: 'var(--brand)', border: '1px solid var(--heirloom-border)',
                                borderRadius: 6, padding: '5px 12px', textDecoration: 'none',
                                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontWeight: 500,
                              }}
                            >
                              Edit this person
                            </a>
                          )}
                          <h2>{nameClean}</h2>
                          <div className="key-facts" style={{ marginTop: '1.5rem' }}>
                            {person.birthDate && (
                              <div className="key-fact">
                                <span className="key-fact-label">Born</span>
                                <span className="key-fact-value">
                                  {person.birthDate}
                                  {person.birthPlace && `, ${shortPlace(person.birthPlace)}`}
                                </span>
                              </div>
                            )}
                            {person.deathDate && (
                              <div className="key-fact">
                                <span className="key-fact-label">Died</span>
                                <span className="key-fact-value">
                                  {person.deathDate}
                                  {person.deathPlace && `, ${shortPlace(person.deathPlace)}`}
                                </span>
                              </div>
                            )}
                            {person.occupation && (
                              <div className="key-fact">
                                <span className="key-fact-label">Occupation</span>
                                <span className="key-fact-value">{person.occupation}</span>
                              </div>
                            )}
                          </div>

                          {/* Read story CTA */}
                          {pathToRoot.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                              <a
                                href={`/trees/${treeSlug}/stories/${encodeURIComponent(person.id)}`}
                                className="story-cta-link"
                              >
                                Read {firstName}&rsquo;s story &rarr;
                              </a>
                            </div>
                          )}

                          {/* FamilySearch hints badge */}
                          {canEdit && (
                            <>
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                              {fsMatches.length > 0 && (
                                <button
                                  onClick={() => setFsOpen(o => !o)}
                                  style={{
                                    background: fsOpen ? 'rgba(139,94,60,0.12)' : 'rgba(139,94,60,0.06)',
                                    border: '1px solid rgba(139,94,60,0.3)',
                                    borderRadius: 20, padding: '5px 12px',
                                    color: 'var(--brand)', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                                    fontSize: 12, cursor: 'pointer',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  {fsMatches.length} record {fsMatches.length === 1 ? 'hint' : 'hints'} {fsOpen ? '▴' : '▾'}
                                </button>
                              )}
                              <button
                                onClick={handleFsSearch}
                                disabled={fsActing === 'search'}
                                style={{
                                  background: 'none', border: '1px solid var(--heirloom-border)',
                                  borderRadius: 20, padding: '5px 12px', color: 'var(--heirloom-ink-muted)',
                                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: 12,
                                  cursor: fsActing === 'search' ? 'wait' : 'pointer',
                                  opacity: fsActing === 'search' ? 0.6 : 1,
                                }}
                              >
                                {fsActing === 'search' ? 'Searching…' : fsMatches.length > 0 ? 'Re-search all sources' : 'Search all sources'}
                              </button>
                            </div>
                            {fsSearchMsg && (
                              <p style={{
                                marginTop: 6, fontSize: 12,
                                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                                color: fsSearchMsg.ok ? 'var(--heirloom-ink)' : '#9a8a7a',
                              }}>
                                {fsSearchMsg.ok ? '✓ ' : ''}{fsSearchMsg.text}
                              </p>
                            )}
                            </>
                          )}
                        </div>
                        <div />
                      </div>
                    </div>
                  )}

                  {/* FamilySearch hints panel */}
                  {fsOpen && fsMatches.length > 0 && (
                    <div style={{ margin: '0 1.5rem 1.25rem', border: '1px solid var(--heirloom-border)', borderRadius: 8, overflow: 'hidden' }}>
                      {fsMatches.map((match, i) => {
                        const fs = JSON.parse(match.fsData) as FsPersonData;
                        const isActing = fsActing === match.id;
                        const isReviewing = reviewMatchId === match.id;
                        const btnBase: React.CSSProperties = {
                          border: 'none', borderRadius: 6, padding: '5px 12px',
                          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: 12, fontWeight: 500,
                          cursor: isActing ? 'wait' : 'pointer', opacity: isActing ? 0.6 : 1,
                        };
                        return (
                          <div
                            key={match.id}
                            style={{
                              padding: '12px 16px',
                              borderTop: i > 0 ? '1px solid #f0ebe3' : undefined,
                              background: i % 2 === 0 ? 'var(--heirloom-bg)' : 'white',
                            }}
                          >
                            {/* Summary row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                <p style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--heirloom-ink)', margin: 0, marginBottom: 2 }}>
                                  {fs.name.replace(/\//g, '').trim()}
                                  <span style={{
                                    fontSize: 10, fontWeight: 600,
                                    padding: '1px 6px', borderRadius: 3, marginLeft: 6,
                                    background: SOURCE_COLORS[match.source] ?? '#888', color: '#fff',
                                    verticalAlign: 'middle',
                                  }}>
                                    {SOURCE_LABELS[match.source] ?? match.source}
                                  </span>
                                </p>
                                <p style={{ fontSize: 12, color: '#9a8a7a', margin: 0, lineHeight: 1.5, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                                  {[
                                    fs.birthDate  && `b. ${fs.birthDate}`,
                                    fs.birthPlace && shortPlace(fs.birthPlace),
                                    fs.deathDate  && `d. ${fs.deathDate}`,
                                    fs.deathPlace && shortPlace(fs.deathPlace),
                                  ].filter(Boolean).join(' · ')}
                                </p>
                                {fs.occupation && (
                                  <p style={{ fontSize: 11, color: '#9a8a7a', margin: 0 }}>{fs.occupation}</p>
                                )}
                              </div>

                              <span style={{
                                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: 12,
                                color: match.score >= 70 ? 'var(--heirloom-ink)' : '#9a8a7a',
                                fontWeight: 500, flexShrink: 0,
                              }}>
                                {Math.round(match.score)}% match
                              </span>

                              {!isReviewing && (
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                  <button disabled={isActing} onClick={() => startReview(match)} style={{ ...btnBase, background: 'var(--brand)', color: '#fff' }}>Review</button>
                                  <button disabled={isActing} onClick={() => handleFsAction(match.id, 'reject')} style={{ ...btnBase, background: 'transparent', border: '1px solid var(--heirloom-border)', color: 'var(--heirloom-ink-muted)' }}>Dismiss</button>
                                </div>
                              )}
                            </div>

                            {/* Field-by-field review panel */}
                            {isReviewing && (
                              <div style={{ marginTop: 12, borderTop: '1px solid #f0ebe3', paddingTop: 10 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                                  <thead>
                                    <tr style={{ fontSize: 11, fontWeight: 600, color: '#9a8a7a', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                                      <th style={{ textAlign: 'left', paddingBottom: 8, width: '20%' }}>Field</th>
                                      <th style={{ textAlign: 'left', paddingBottom: 8, width: '35%' }}>In tree</th>
                                      <th style={{ textAlign: 'left', paddingBottom: 8, width: '35%' }}>From source</th>
                                      <th style={{ textAlign: 'center', paddingBottom: 8, width: '10%' }}>Import</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {REVIEW_FIELDS.map(({ key, label }) => {
                                      const srcVal = fs[key as keyof FsPersonData] as string | null | undefined;
                                      const localVal = person ? (person as unknown as Record<string, unknown>)[key] as string | null | undefined : null;
                                      const hasSource = !!srcVal;
                                      const isSame = hasSource && srcVal === localVal;
                                      const isSelected = reviewFields.has(key);
                                      return (
                                        <tr key={key} style={{ borderTop: '1px solid #f0ebe3' }}>
                                          <td style={{ padding: '6px 0', fontSize: 11, fontWeight: 600, color: '#9a8a7a', textTransform: 'uppercase' as const, letterSpacing: '0.3px' }}>{label}</td>
                                          <td style={{ padding: '6px 10px 6px 0', color: localVal ? 'var(--heirloom-ink)' : '#9a8a7a', opacity: localVal ? 1 : 0.45 }}>{localVal || '—'}</td>
                                          <td style={{ padding: '6px 10px 6px 0', color: isSame ? '#9a8a7a' : hasSource ? 'var(--heirloom-ink)' : '#9a8a7a', opacity: hasSource ? 1 : 0.45 }}>{srcVal || '—'}</td>
                                          <td style={{ textAlign: 'center', padding: '6px 0' }}>
                                            {isSame ? (
                                              <span style={{ fontSize: 11, color: '#9a8a7a', opacity: 0.6 }}>same</span>
                                            ) : hasSource ? (
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={e => {
                                                  setReviewFields(prev => {
                                                    const next = new Set(prev);
                                                    if (e.target.checked) next.add(key); else next.delete(key);
                                                    return next;
                                                  });
                                                }}
                                                style={{ cursor: 'pointer', accentColor: 'var(--brand)', width: 15, height: 15 }}
                                              />
                                            ) : (
                                              <span style={{ fontSize: 11, color: '#9a8a7a', opacity: 0.4 }}>—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10, flexWrap: 'wrap' }}>
                                  <button onClick={() => setReviewMatchId(null)} style={{ ...btnBase, background: 'transparent', border: '1px solid var(--heirloom-border)', color: 'var(--heirloom-ink-muted)' }}>Cancel</button>
                                  <button disabled={isActing} onClick={() => handleFsAction(match.id, 'reject')} style={{ ...btnBase, background: 'transparent', border: '1px solid var(--heirloom-border)', color: 'var(--heirloom-ink-muted)' }}>Dismiss match</button>
                                  <button
                                    disabled={isActing}
                                    onClick={() => {
                                      const updates: Record<string, string> = {};
                                      for (const key of reviewFields) {
                                        const v = fs[key as keyof FsPersonData] as string | null | undefined;
                                        if (v) updates[key] = v;
                                      }
                                      handleFsAction(match.id, 'accept', updates);
                                    }}
                                    style={{ ...btnBase, background: 'var(--brand)', color: '#fff' }}
                                  >
                                    {isActing ? 'Saving…' : 'Confirm match'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {fsActionError && (
                    <p style={{ color: '#b91c2a', fontSize: 13, margin: '0 1.5rem 1rem', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                      {fsActionError}
                    </p>
                  )}

                  {/* 3-col layout: parents | narrative | children */}
                  <div className="chapter-layout">
                    <div className="chapter-col-side">
                      <ConnGroup label="Parents" people={parents} navigate={navigateTo} addHref={parentAddHref} citizenshipMode={citizenshipMode} />
                    </div>
                    <div className="chapter-col-center">
                      {loading ? (
                        <p style={{ color: '#9a8a7a', fontStyle: 'italic', fontSize: 13, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Loading…</p>
                      ) : (
                        <>
                          {person.narrative && (
                            <div dangerouslySetInnerHTML={{ __html: person.narrative }} />
                          )}
                        </>
                      )}
                    </div>
                    <div className="chapter-col-side">
                      <ConnGroup label="Children" people={children} navigate={navigateTo} max={30} addHref={childAddHref} citizenshipMode={citizenshipMode} />
                    </div>
                  </div>

                  {(spouses.length > 0 || canEdit) && (
                    <div className="chapter-below">
                      <ConnGroup label="Spouses" people={spouses} navigate={navigateTo} addHref={spouseAddHref} citizenshipMode={citizenshipMode} />
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Fan view */}
          {activeView === 'fan' && (
            <div className="fan-view-placeholder">
              <h3>Fan Chart</h3>
              <p>
                The fan chart view displays ancestors in a semicircular layout, making it easy to see
                multiple generations at a glance. This view is coming soon.
              </p>
              <p style={{ marginTop: 12, fontSize: 12, color: '#9a8a7a' }}>
                Currently viewing: {nameClean}
              </p>
            </div>
          )}

          {/* Family view */}
          {activeView === 'family' && (
            <div className="family-view-placeholder">
              <h3>Family Group</h3>
              <p>
                The family group view centers on {firstName} with parents above, spouse(s) alongside,
                and children below. This view is coming soon.
              </p>
              <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {parents.length > 0 && (
                  <div style={{ background: '#f0ebe3', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
                    Parents: {parents.map(p => cleanName(p.name)).join(', ')}
                  </div>
                )}
                <div style={{ background: 'var(--brand-light)', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '2px solid var(--brand)' }}>
                  {nameClean}
                </div>
                {spouses.length > 0 && (
                  <div style={{ background: '#f0ebe3', padding: '8px 14px', borderRadius: 8, fontSize: 12, borderStyle: 'dashed', border: '1px dashed var(--heirloom-border)' }}>
                    Spouse: {spouses.map(s => cleanName(s.name)).join(', ')}
                  </div>
                )}
              </div>
              {children.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {children.map(c => (
                    <button key={c.id} onClick={() => navigateTo(c.id)} style={{
                      background: 'white', padding: '6px 12px', borderRadius: 8, fontSize: 12,
                      border: '1px solid var(--heirloom-border)', cursor: 'pointer',
                    }}>
                      {cleanName(c.name)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Citizenship legend */}
          {citizenshipMode && (
            <div className="citizenship-legend">
              <div className="citizenship-legend-title">Citizenship Mode</div>
              <div className="citizenship-legend-item">
                <span className="citizenship-dot citizenship-dot-green" />
                All docs collected
              </div>
              <div className="citizenship-legend-item">
                <span className="citizenship-dot citizenship-dot-amber" />
                Docs partially collected
              </div>
              <div className="citizenship-legend-item">
                <span className="citizenship-dot citizenship-dot-red" />
                Documents missing
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Chat */}
      <ChatPanel
        treeSlug={treeSlug}
        currentPersonId={currentId}
        onNavigateTo={id => { navigateTo(id); }}
        onMatchesSearched={(personId) => {
          if (personId !== currentId) return;
          fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(personId)}/fs-matches`)
            .then(r => r.ok ? r.json() : { matches: [] })
            .then((d: { matches: FsMatch[] }) => {
              const m = d.matches ?? [];
              setFsMatches(m);
              if (m.length > 0) setFsOpen(true);
            })
            .catch(() => {});
        }}
      />
    </div>
  );
}

// ── Connection group ──────────────────────────────────────────────────────
function ConnGroup({
  label, people, navigate, max = 20, addHref, citizenshipMode,
}: {
  label: string;
  people: PersonRelation[];
  navigate: (id: string) => void;
  max?: number;
  addHref?: string;
  citizenshipMode?: boolean;
}) {
  if (people.length === 0 && !addHref) return null;
  const shown = people.slice(0, max);
  return (
    <div className="ch-conn-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
        <span className="ch-conn-label" style={{ marginBottom: 0 }}>{label}{people.length > 0 ? ` (${people.length})` : ''}</span>
        {addHref && (
          <a
            href={addHref}
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: 11, fontWeight: 500,
              color: 'var(--heirloom-ink-muted)', textDecoration: 'none', border: '1px solid var(--heirloom-border)',
              borderRadius: 6, padding: '3px 8px', flexShrink: 0, transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0ebe3')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            + Add
          </a>
        )}
      </div>
      {people.length > 0 && (
        <div className="ch-conn-cards">
          {shown.map(p => (
            <button
              key={p.id}
              className="ch-nav-card"
              onClick={() => navigate(p.id)}
              style={{ position: 'relative' }}
            >
              <span className="ch-nav-name">{cleanName(p.name)}</span>
              {formatLifespan(p) && <span className="ch-nav-life">{formatLifespan(p)}</span>}
              {p.birthPlace && <span className="ch-nav-place">{shortPlace(p.birthPlace)}</span>}
              {citizenshipMode && (
                <span className={`pnode-citizenship-dot citizenship-dot-${getCitizenshipStatus(p.id)}`} />
              )}
            </button>
          ))}
          {people.length > max && (
            <span className="ch-nav-empty">…and {people.length - max} more</span>
          )}
        </div>
      )}
    </div>
  );
}
