'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CHAPTER_NARRATIVES, CHAPTER_CHAIN, DIRECT_LINE_IDS } from './chapters';
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

interface PersonFull extends PersonRelation {
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

  // Siblings = other children in the families where p is a child
  const siblings: PersonRelation[] = [];
  const seenSibs = new Set<string>();
  seenSibs.add(p.id);
  for (const fc of p.childIn) {
    // Need to fetch sibling data — not available here without a separate API call
    // We'll skip siblings for initial implementation
  }

  return { parents, spouses, children };
}

// ── Main component ────────────────────────────────────────────────────────
const KEVIN_ID = '@I500001@';

export default function TreeExplorer({ initialPerson }: { initialPerson?: PersonFull }) {
  const [currentId, setCurrentId] = useState(KEVIN_ID);
  const [person, setPerson] = useState<PersonFull | null>(initialPerson ?? null);
  const [loading, setLoading] = useState(!initialPerson);
  const cache = useRef<Map<string, PersonFull>>(new Map());

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const navigateTo = useCallback(async (id: string) => {
    if (cache.current.has(id)) {
      setPerson(cache.current.get(id)!);
      setCurrentId(id);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/people/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        cache.current.set(id, data);
        setPerson(data);
        setCurrentId(id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialPerson) navigateTo(KEVIN_ID);
    else {
      cache.current.set(KEVIN_ID, initialPerson);
      setCurrentId(KEVIN_ID);
    }
  }, [initialPerson, navigateTo]);

  // Store fetched person in cache
  useEffect(() => {
    if (person) cache.current.set(person.id, person);
  }, [person]);

  function handleSearch(q: string) {
    setQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q.trim()) { setShowResults(false); return; }
    searchDebounce.current = setTimeout(async () => {
      const res = await fetch(`/api/people?q=${encodeURIComponent(q)}&limit=12`);
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

  if (!person && loading) {
    return (
      <div className="chapters-section">
        <div style={{ padding: '4rem', color: 'var(--sepia)', fontStyle: 'italic' }}>Loading…</div>
      </div>
    );
  }

  if (!person) return null;

  const { parents, spouses, children } = deriveRelations(person);
  const narrative = CHAPTER_NARRATIVES[person.id];
  const lifespan  = formatLifespan(person);
  const nameClean = cleanName(person.name);
  const isDirect  = DIRECT_LINE_IDS.has(person.id);

  // Show the chain from the currently-viewed person down to Kevin.
  // For people not on the direct line, show the full chain for navigation.
  const activeChainIndex = CHAPTER_CHAIN.findIndex(e => e.personId === currentId);
  const visibleChain = activeChainIndex >= 0
    ? CHAPTER_CHAIN.slice(activeChainIndex)
    : CHAPTER_CHAIN;

  return (
    <section id="chapters" className="chapters-section">
      {/* ── Timeline sidebar ── */}
      <aside className="chapters-timeline">
        <div className="timeline-crumb">
          {visibleChain.map((entry, i) => {
            const isActive = currentId === entry.personId;
            return (
              <span key={entry.personId}>
                <button
                  className={`crumb-node${isActive ? ' crumb-node--active' : ''}`}
                  onClick={() => navigateTo(entry.personId)}
                >
                  <span className="crumb-dot" />
                  <span className="crumb-text">
                    <span className="crumb-name">{entry.name} Gaasch</span>
                    <span className="crumb-year">{entry.year}</span>
                  </span>
                </button>
                {i < visibleChain.length - 1 && (
                  <span className="crumb-arrow">↓</span>
                )}
              </span>
            );
          })}
        </div>
      </aside>

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
            ) : narrative ? (
              narrative
            ) : (
              // Generic person card
              <>
                <div className="chapter-header">
                  <h2>{nameClean}</h2>
                  {(lifespan || person.birthPlace) && (
                    <p className="chapter-meta">
                      {lifespan}
                      {lifespan && person.birthPlace && ' · '}
                      {shortPlace(person.birthPlace)}
                    </p>
                  )}
                </div>
                <div className="key-facts">
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
            className={`ch-nav-card${DIRECT_LINE_IDS.has(p.id) ? ' ch-nav-card--ancestor' : ''}`}
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
