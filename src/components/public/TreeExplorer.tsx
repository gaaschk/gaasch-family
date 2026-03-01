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

  // FamilySearch hints
  const [fsMatches, setFsMatches]     = useState<FsMatch[]>([]);
  const [fsOpen, setFsOpen]           = useState(false);
  const [fsActing, setFsActing]       = useState<string | null>(null); // matchId being processed
  const [fsActionError, setFsActionError] = useState('');
  const [fsSearchMsg, setFsSearchMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fsSearchMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Field-by-field review state
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

  if (!person && loading) {
    return (
      <div className="chapters-section">
        <div style={{ padding: '4rem', color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</div>
      </div>
    );
  }

  if (!person) {
    const canEdit = role === 'editor' || role === 'admin';
    return (
      <section id="chapters" className="chapters-section">
        <div className="chapters-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
          <div style={{ textAlign: 'center', color: 'var(--sepia)', padding: '3rem 2rem' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>
              This tree has no people yet.
            </p>
            {canEdit ? (
              <>
                <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                  Add your first person to get started.
                </p>
                <a href={`/trees/${treeSlug}/admin/people/new`} className="btn btn-primary">
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
      </section>
    );
  }

  const { parents, spouses, children } = deriveRelations(person);
  const lifespan  = formatLifespan(person);
  const nameClean = cleanName(person.name);
  const firstName = nameClean.split(' ')[0];

  const canEdit = role === 'editor' || role === 'admin';
  // Pre-fill the new family form with the current person in the right slot
  const parentSlot = person.sex === 'F' ? 'wifeId' : 'husbId';
  const familyNewBase = `/trees/${treeSlug}/admin/families/new`;
  const parentAddHref  = canEdit ? `${familyNewBase}?childId=${person.id}` : undefined;
  const childAddHref   = canEdit ? `${familyNewBase}?${parentSlot}=${person.id}` : undefined;
  const spouseAddHref  = canEdit ? `${familyNewBase}?${parentSlot}=${person.id}` : undefined;

  return (
    <section id="chapters" className="chapters-section">
      {/* ── Lineage sidebar ── */}
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

          {/* Read story link — all roles */}
          <div style={{ padding: '1.5rem 0.75rem 0.75rem' }}>
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

      {/* ── Main chapter area ── */}
      <div className="chapters-main">
        {/* Search */}
        <div className="chapter-search-wrap">
          <input
            ref={searchRef}
            type="text"
            className="chapter-search-input"
            placeholder="Search all people by name…"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            autoComplete="off"
          />
          {showResults && (
            <div className="chapter-search-results">
              {searchResults.length === 0 ? (
                <div className="ch-search-empty">No results for &ldquo;{query}&rdquo;</div>
              ) : (
                searchResults.map(p => (
                  <div
                    key={p.id}
                    className="ch-search-item"
                    onMouseDown={() => selectSearchResult(p)}
                    tabIndex={0}
                  >
                    <strong>{cleanName(p.name)}</strong>
                    {formatLifespan(p) && (
                      <span className="ch-search-life"> {formatLifespan(p)}</span>
                    )}
                    {p.birthPlace && (
                      <span className="ch-search-place"> · {shortPlace(p.birthPlace)}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Full-width chapter header */}
        {!loading && (
          <div className="chapter-header">
            {/* Mirror the chapter-layout grid so content aligns with the center column */}
            <div className="chapter-header-grid">
              <div />
              <div style={{ textAlign: 'center' }}>
                {(role === 'editor' || role === 'admin') && (
                  <a
                    href={`/trees/${treeSlug}/admin/people/${encodeURIComponent(person.id)}/edit`}
                    style={{
                      display: 'inline-block',
                      marginBottom: '1rem',
                      fontSize: '0.78rem',
                      color: 'var(--rust)',
                      border: '1px solid rgba(139,69,19,0.3)',
                      borderRadius: '4px',
                      padding: '0.3rem 0.75rem',
                      textDecoration: 'none',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Edit this person ›
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
                {(role === 'editor' || role === 'admin') && (
                  <>
                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {fsMatches.length > 0 && (
                      <button
                        onClick={() => setFsOpen(o => !o)}
                        style={{
                          background: fsOpen ? 'rgba(196,150,42,0.18)' : 'rgba(196,150,42,0.08)',
                          border: '1px solid rgba(196,150,42,0.4)',
                          borderRadius: 20,
                          padding: '0.3rem 0.85rem',
                          color: 'var(--gold)',
                          fontFamily: 'var(--font-sc)',
                          fontSize: '0.65rem',
                          letterSpacing: '0.07em',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        ⟷ {fsMatches.length} record {fsMatches.length === 1 ? 'hint' : 'hints'} {fsOpen ? '▴' : '▾'}
                      </button>
                    )}
                    <button
                      onClick={handleFsSearch}
                      disabled={fsActing === 'search'}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(122,92,46,0.3)',
                        borderRadius: 20,
                        padding: '0.3rem 0.85rem',
                        color: 'var(--sepia)',
                        fontFamily: 'var(--font-sc)',
                        fontSize: '0.63rem',
                        letterSpacing: '0.07em',
                        cursor: fsActing === 'search' ? 'wait' : 'pointer',
                        opacity: fsActing === 'search' ? 0.6 : 1,
                      }}
                    >
                      {fsActing === 'search' ? 'Searching…' : fsMatches.length > 0 ? 'Re-search all sources' : 'Search all sources'}
                    </button>
                  </div>
                  {fsSearchMsg && (
                    <p style={{
                      marginTop: '0.5rem',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-sc)',
                      letterSpacing: '0.04em',
                      color: fsSearchMsg.ok ? 'var(--ink)' : 'var(--sepia)',
                      opacity: 0.85,
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
          <div
            style={{
              margin: '0 2rem 1.5rem',
              border: '1px solid rgba(196,150,42,0.3)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {fsMatches.map((match, i) => {
              const fs = JSON.parse(match.fsData) as FsPersonData;
              const isActing = fsActing === match.id;
              const isReviewing = reviewMatchId === match.id;
              const btnBase: React.CSSProperties = {
                border: 'none', borderRadius: 4, padding: '0.3rem 0.75rem',
                fontFamily: 'var(--font-sc)', fontSize: '0.65rem', letterSpacing: '0.07em',
                cursor: isActing ? 'wait' : 'pointer', opacity: isActing ? 0.6 : 1,
              };
              return (
                <div
                  key={match.id}
                  style={{
                    padding: '1rem 1.25rem',
                    borderTop: i > 0 ? '1px solid rgba(196,150,42,0.2)' : undefined,
                    background: i % 2 === 0 ? 'rgba(242,232,213,0.4)' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {/* ── Summary row ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {/* Match info */}
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--ink)', margin: 0, marginBottom: '0.2rem' }}>
                        {fs.name.replace(/\//g, '').trim()}
                        <span style={{
                          fontSize: '0.58rem', fontFamily: 'var(--font-sc)', letterSpacing: '0.06em',
                          padding: '0.1rem 0.45rem', borderRadius: 3, marginLeft: '0.5rem',
                          background: SOURCE_COLORS[match.source] ?? '#888', color: '#fff',
                          opacity: 0.9, verticalAlign: 'middle',
                        }}>
                          {SOURCE_LABELS[match.source] ?? match.source}
                        </span>
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--sepia)', margin: 0, lineHeight: 1.5 }}>
                        {[
                          fs.birthDate  && `b. ${fs.birthDate}`,
                          fs.birthPlace && shortPlace(fs.birthPlace),
                          fs.deathDate  && `d. ${fs.deathDate}`,
                          fs.deathPlace && shortPlace(fs.deathPlace),
                        ].filter(Boolean).join(' · ')}
                      </p>
                      {fs.occupation && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--sepia)', margin: 0, opacity: 0.8 }}>{fs.occupation}</p>
                      )}
                    </div>

                    {/* Score */}
                    <span style={{
                      fontFamily: 'var(--font-sc)', fontSize: '0.65rem',
                      color: match.score >= 70 ? 'var(--ink)' : 'var(--sepia)',
                      letterSpacing: '0.05em', flexShrink: 0,
                    }}>
                      {Math.round(match.score)}% match
                    </span>

                    {/* Action buttons — hidden while reviewing */}
                    {!isReviewing && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          disabled={isActing}
                          onClick={() => startReview(match)}
                          style={{ ...btnBase, background: 'var(--rust)', color: '#fff' }}
                        >
                          Review
                        </button>
                        <button
                          disabled={isActing}
                          onClick={() => handleFsAction(match.id, 'reject')}
                          style={{ ...btnBase, background: 'transparent', border: '1px solid rgba(122,92,46,0.3)', color: 'var(--sepia)' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Field-by-field review panel ── */}
                  {isReviewing && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(196,150,42,0.2)', paddingTop: '0.75rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ fontFamily: 'var(--font-sc)', fontSize: '0.6rem', letterSpacing: '0.06em', color: 'var(--sepia)' }}>
                            <th style={{ textAlign: 'left', paddingBottom: '0.5rem', width: '20%' }}>Field</th>
                            <th style={{ textAlign: 'left', paddingBottom: '0.5rem', width: '35%' }}>In tree</th>
                            <th style={{ textAlign: 'left', paddingBottom: '0.5rem', width: '35%' }}>From source</th>
                            <th style={{ textAlign: 'center', paddingBottom: '0.5rem', width: '10%' }}>Import</th>
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
                              <tr key={key} style={{ borderTop: '1px solid rgba(196,150,42,0.1)' }}>
                                <td style={{ padding: '0.4rem 0', fontFamily: 'var(--font-sc)', fontSize: '0.62rem', letterSpacing: '0.04em', color: 'var(--sepia)' }}>
                                  {label}
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem 0.4rem 0', color: localVal ? 'var(--ink)' : 'var(--sepia)', opacity: localVal ? 1 : 0.45 }}>
                                  {localVal || '—'}
                                </td>
                                <td style={{ padding: '0.4rem 0.75rem 0.4rem 0', color: isSame ? 'var(--sepia)' : hasSource ? 'var(--ink)' : 'var(--sepia)', opacity: hasSource ? 1 : 0.45 }}>
                                  {srcVal || '—'}
                                </td>
                                <td style={{ textAlign: 'center', padding: '0.4rem 0' }}>
                                  {isSame ? (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--sepia)', opacity: 0.6 }}>same</span>
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
                                      style={{ cursor: 'pointer', accentColor: 'var(--rust)', width: 15, height: 15 }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--sepia)', opacity: 0.4 }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Review actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setReviewMatchId(null)}
                          style={{ ...btnBase, background: 'transparent', border: '1px solid rgba(122,92,46,0.25)', color: 'var(--sepia)' }}
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isActing}
                          onClick={() => handleFsAction(match.id, 'reject')}
                          style={{ ...btnBase, background: 'transparent', border: '1px solid rgba(122,92,46,0.3)', color: 'var(--sepia)' }}
                        >
                          Dismiss match
                        </button>
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
                          style={{ ...btnBase, background: 'var(--rust)', color: '#fff' }}
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
          <p style={{ color: 'var(--rust)', fontSize: '0.82rem', margin: '0 2rem 1rem', textAlign: 'center' }}>
            {fsActionError}
          </p>
        )}

        {/* 3-col layout: parents | narrative | children */}
        <div className="chapter-layout">
          {/* Left: Parents */}
          <div className="chapter-col-side">
            <ConnGroup label="Parents" people={parents} navigate={navigateTo} addHref={parentAddHref} />
          </div>

          {/* Center: Narrative */}
          <div className="chapter-col-center">
            {loading ? (
              <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</p>
            ) : (
              <>
                {person.narrative && (
                  <div dangerouslySetInnerHTML={{ __html: person.narrative }} />
                )}
              </>
            )}
          </div>

          {/* Right: Children */}
          <div className="chapter-col-side">
            <ConnGroup label="Children" people={children} navigate={navigateTo} max={30} addHref={childAddHref} />
          </div>
        </div>

        {/* Below: Spouses */}
        {(spouses.length > 0 || canEdit) && (
          <div className="chapter-below">
            <ConnGroup label="Spouses" people={spouses} navigate={navigateTo} addHref={spouseAddHref} />
          </div>
        )}
      </div>

      {/* ── AI Chat ── */}
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
    </section>
  );
}

// ── Connection group ──────────────────────────────────────────────────────
function ConnGroup({
  label, people, navigate, max = 20, addHref,
}: {
  label: string;
  people: PersonRelation[];
  navigate: (id: string) => void;
  max?: number;
  addHref?: string;
}) {
  if (people.length === 0 && !addHref) return null;
  const shown = people.slice(0, max);
  return (
    <div className="ch-conn-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span className="ch-conn-label" style={{ marginBottom: 0 }}>{label}{people.length > 0 ? ` (${people.length})` : ''}</span>
        {addHref && (
          <a
            href={addHref}
            style={{
              fontFamily: 'var(--font-sc)',
              fontSize: '0.6rem',
              letterSpacing: '0.08em',
              color: 'var(--sepia)',
              textDecoration: 'none',
              border: '1px solid rgba(122,92,46,0.3)',
              borderRadius: 4,
              padding: '0.2rem 0.5rem',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(122,92,46,0.08)')}
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
            >
              <span className="ch-nav-name">{cleanName(p.name)}</span>
              {formatLifespan(p) && <span className="ch-nav-life">{formatLifespan(p)}</span>}
              {p.birthPlace && <span className="ch-nav-place">{shortPlace(p.birthPlace)}</span>}
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
