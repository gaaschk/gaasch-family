'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Person } from '@/types';
import ChatPanel from './ChatPanel';

// ── FamilySearch match types ──────────────────────────────────────────────
interface FsMatch {
  id:      string;
  fsPid:   string;
  score:   number;
  fsData:  string; // JSON: FsPersonSummary
  status:  string;
}

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
}: {
  treeSlug: string;
  treeName?: string;
  initialPerson?: PersonFull;
  role?: string;
  defaultPersonId?: string;
  userId?: string;
  hasFsConnection?: boolean;
}) {
  const [currentId, setCurrentId] = useState<string | null>(initialPerson?.id ?? null);
  const [person, setPerson] = useState<PersonFull | null>(initialPerson ?? null);
  const [loading, setLoading] = useState(!initialPerson);
  const [pathToRoot, setPathToRoot] = useState<PathNode[]>([]);
  const cache = useRef<Map<string, PersonFull>>(new Map());

  // Lineage story modal
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyHtml, setStoryHtml] = useState('');
  const [storyGenerating, setStoryGenerating] = useState(false);

  // FamilySearch hints
  const [fsMatches, setFsMatches]     = useState<FsMatch[]>([]);
  const [fsOpen, setFsOpen]           = useState(false);
  const [fsActing, setFsActing]       = useState<string | null>(null); // matchId being processed

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
    if (!currentId || (role !== 'editor' && role !== 'admin')) return;
    fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(currentId)}/fs-matches`)
      .then(r => r.ok ? r.json() : { matches: [] })
      .then((d: { matches: FsMatch[] }) => setFsMatches(d.matches ?? []))
      .catch(() => {});
  }, [currentId, treeSlug, role]);

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

  async function generateStory() {
    if (pathToRoot.length === 0) return;
    setStoryHtml('');
    setStoryGenerating(true);
    setStoryOpen(true);
    try {
      const res = await fetch(`/api/trees/${treeSlug}/generate-lineage-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personIds: pathToRoot.map(n => n.id) }),
      });
      if (!res.ok || !res.body) {
        setStoryHtml('<p class="body-text">Failed to generate story.</p>');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStoryHtml(accumulated);
      }
      // Strip code fences if model wraps in them
      accumulated = accumulated.replace(/^```(?:html)?\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      setStoryHtml(accumulated);
    } finally {
      setStoryGenerating(false);
    }
  }

  async function handleFsAction(matchId: string, action: 'accept' | 'reject', updateFields = false) {
    setFsActing(matchId);
    try {
      const res = await fetch(
        `/api/trees/${treeSlug}/people/${encodeURIComponent(currentId!)}/fs-matches/${matchId}`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action, updateFields }),
        },
      );
      if (res.ok) {
        const data = await res.json() as { person?: PersonFull };
        setFsMatches(prev => prev.filter(m => m.id !== matchId));
        // If fields were updated, refresh the person view
        if (data.person && currentId) await navigateTo(currentId);
      }
    } finally {
      setFsActing(null);
    }
  }

  async function handleFsSearch() {
    if (!currentId) return;
    setFsActing('search');
    try {
      const res = await fetch(
        `/api/trees/${treeSlug}/people/${encodeURIComponent(currentId)}/fs-matches`,
        { method: 'POST' },
      );
      if (res.ok) {
        const data = await res.json() as { matches: FsMatch[] };
        setFsMatches(data.matches ?? []);
        setFsOpen(true);
      }
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

  if (!person) return null;

  const { parents, spouses, children } = deriveRelations(person);
  const lifespan  = formatLifespan(person);
  const nameClean = cleanName(person.name);

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

          {/* Generate lineage story button */}
          <div style={{ padding: '1.5rem 0.75rem 0.75rem' }}>
            <button
              onClick={generateStory}
              disabled={storyGenerating}
              style={{
                width: '100%',
                background: 'rgba(196,150,42,0.12)',
                border: '1px solid rgba(196,150,42,0.35)',
                borderRadius: 4,
                color: 'var(--gold-light)',
                fontFamily: 'var(--font-sc)',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                padding: '0.5rem 0.4rem',
                cursor: storyGenerating ? 'wait' : 'pointer',
                lineHeight: 1.4,
                transition: 'background 0.15s',
              }}
            >
              {storyGenerating ? 'Generating…' : 'Generate Story'}
            </button>
          </div>
        </nav>
      )}

      {/* ── Lineage story modal ── */}
      {storyOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setStoryOpen(false); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(26,18,8,0.75)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '3rem 1rem',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: 'var(--parchment)',
              border: '2px solid var(--gold)',
              borderRadius: 6,
              maxWidth: 720,
              width: '100%',
              padding: '2.5rem 2.5rem 3rem',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setStoryOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--sepia)',
                fontSize: '1.4rem',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>

            {storyGenerating && !storyHtml && (
              <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>
                Generating lineage story…
              </p>
            )}

            {storyHtml && (
              <div dangerouslySetInnerHTML={{ __html: storyHtml }} />
            )}
          </div>
        </div>
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
          <div className="chapter-header" style={{ padding: '2rem 2rem 2rem' }}>
            {/* Mirror the chapter-layout grid so content aligns with the center column */}
            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr 170px', gap: '1.5rem 2.5rem' }}>
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

                {/* FamilySearch hints badge */}
                {(role === 'editor' || role === 'admin') && (
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
                        ⟷ {fsMatches.length} FamilySearch {fsMatches.length === 1 ? 'hint' : 'hints'} {fsOpen ? '▴' : '▾'}
                      </button>
                    )}
                    {hasFsConnection && (
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
                        {fsActing === 'search' ? 'Searching…' : fsMatches.length > 0 ? 'Re-search' : 'Search FamilySearch'}
                      </button>
                    )}
                  </div>
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
              return (
                <div
                  key={match.id}
                  style={{
                    padding: '1rem 1.25rem',
                    borderTop: i > 0 ? '1px solid rgba(196,150,42,0.2)' : undefined,
                    background: i % 2 === 0 ? 'rgba(242,232,213,0.4)' : 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Match info */}
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--ink)', margin: 0, marginBottom: '0.2rem' }}>
                      {fs.name.replace(/\//g, '').trim()}
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
                  <span
                    style={{
                      fontFamily: 'var(--font-sc)',
                      fontSize: '0.65rem',
                      color: match.score >= 70 ? 'var(--ink)' : 'var(--sepia)',
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(match.score)}% match
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <button
                      disabled={isActing}
                      onClick={() => handleFsAction(match.id, 'accept', true)}
                      style={{
                        background: 'var(--rust)',
                        border: 'none',
                        borderRadius: 4,
                        padding: '0.3rem 0.75rem',
                        color: '#fff',
                        fontFamily: 'var(--font-sc)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.07em',
                        cursor: isActing ? 'wait' : 'pointer',
                        opacity: isActing ? 0.6 : 1,
                      }}
                    >
                      Link &amp; Update
                    </button>
                    <button
                      disabled={isActing}
                      onClick={() => handleFsAction(match.id, 'accept', false)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--rust)',
                        borderRadius: 4,
                        padding: '0.3rem 0.75rem',
                        color: 'var(--rust)',
                        fontFamily: 'var(--font-sc)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.07em',
                        cursor: isActing ? 'wait' : 'pointer',
                        opacity: isActing ? 0.6 : 1,
                      }}
                    >
                      Link only
                    </button>
                    <button
                      disabled={isActing}
                      onClick={() => handleFsAction(match.id, 'reject')}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(122,92,46,0.3)',
                        borderRadius: 4,
                        padding: '0.3rem 0.75rem',
                        color: 'var(--sepia)',
                        fontFamily: 'var(--font-sc)',
                        fontSize: '0.65rem',
                        letterSpacing: '0.07em',
                        cursor: isActing ? 'wait' : 'pointer',
                        opacity: isActing ? 0.6 : 1,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3-col layout: parents | narrative | children */}
        <div className="chapter-layout">
          {/* Left: Parents */}
          <div className="chapter-col-side">
            {parents.length > 0 && (
              <ConnGroup label="Parents" people={parents} navigate={navigateTo} />
            )}
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
            {children.length > 0 && (
              <ConnGroup label="Children" people={children} navigate={navigateTo} max={30} />
            )}
          </div>
        </div>

        {/* Below: Spouses */}
        {spouses.length > 0 && (
          <div className="chapter-below">
            <ConnGroup label="Spouses" people={spouses} navigate={navigateTo} />
          </div>
        )}
      </div>

      {/* ── AI Chat ── */}
      <ChatPanel
        treeSlug={treeSlug}
        currentPersonId={currentId}
        onNavigateTo={id => { navigateTo(id); }}
      />
    </section>
  );
}

// ── Connection group ──────────────────────────────────────────────────────
function ConnGroup({
  label, people, navigate, max = 20,
}: {
  label: string;
  people: PersonRelation[];
  navigate: (id: string) => void;
  max?: number;
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  return (
    <div className="ch-conn-group">
      <span className="ch-conn-label">{label} ({people.length})</span>
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
    </div>
  );
}
