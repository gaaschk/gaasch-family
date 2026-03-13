'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Person } from '@/types';
import ChatPanel from './ChatPanel';
import PedigreeCanvas from './PedigreeCanvas';

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

  const [citizenshipMode, setCitizenshipMode] = useState(true);
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
          <PedigreeCanvas
            treeSlug={treeSlug}
            focusPersonId={currentId}
            onPersonSelect={navigateTo}
            citizenshipMode={citizenshipMode}
          />
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

