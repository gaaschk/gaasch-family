'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Person } from '@/types';

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
  initialPerson,
  role,
  defaultPersonId,
}: {
  treeSlug: string;
  initialPerson?: PersonFull;
  role?: string;
  defaultPersonId?: string;
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

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const navigateTo = useCallback(async (id: string) => {
    if (cache.current.has(id)) {
      const cached = cache.current.get(id)!;
      setPerson(cached);
      setCurrentId(id);
      if (cached.pathToRoot) setPathToRoot(cached.pathToRoot);
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
      }
    } finally {
      setLoading(false);
    }
  }, [treeSlug]);

  // On mount: navigate to defaultPersonId, or first alphabetically
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
        if (defaultPersonId) {
          await navigateTo(defaultPersonId);
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
  }, [initialPerson, treeSlug, navigateTo, defaultPersonId]);

  // Store fetched person in cache
  useEffect(() => {
    if (person) cache.current.set(person.id, person);
  }, [person]);

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
              </div>
              <div />
            </div>
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
