'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types (shared with TreeExplorer) ────────────────────────────────────────
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
  narrative: string | null;
  pathToRoot?: { id: string; name: string }[];
  childIn: {
    familyId: string;
    family: {
      id: string;
      husband: PersonRelation | null;
      wife: PersonRelation | null;
    };
  }[];
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

type CanvasView = 'pedigree' | 'family' | 'fan';

// ── Helpers ─────────────────────────────────────────────────────────────────
function cleanName(name: string) {
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

function formatDates(p: PersonRelation) {
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

function getParents(p: PersonFull): { father: PersonRelation | null; mother: PersonRelation | null } {
  let father: PersonRelation | null = null;
  let mother: PersonRelation | null = null;
  for (const fc of p.childIn) {
    if (fc.family.husband && !father) father = fc.family.husband;
    if (fc.family.wife && !mother) mother = fc.family.wife;
  }
  return { father, mother };
}

function getSpouses(p: PersonFull): PersonRelation[] {
  const spouses: PersonRelation[] = [];
  const seen = new Set<string>();
  for (const f of [...p.asHusband, ...p.asWife]) {
    const s = 'wife' in f ? (f as { wife: PersonRelation | null }).wife
                          : (f as { husband: PersonRelation | null }).husband;
    if (s && !seen.has(s.id)) { seen.add(s.id); spouses.push(s); }
  }
  return spouses;
}

function getChildren(p: PersonFull): PersonRelation[] {
  const children: PersonRelation[] = [];
  const seen = new Set<string>();
  for (const f of [...p.asHusband, ...p.asWife]) {
    for (const fc of f.children) {
      if (!seen.has(fc.personId)) { seen.add(fc.personId); children.push(fc.person); }
    }
  }
  return children;
}

function getCitizenshipStatus(id: string): 'green' | 'amber' | 'red' {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const n = Math.abs(hash) % 3;
  return n === 0 ? 'green' : n === 1 ? 'amber' : 'red';
}

// ── Slot types ──────────────────────────────────────────────────────────────
interface AncestorSlot {
  person: PersonFull | null;  // null = unknown/phantom
  personId: string | null;
  loading: boolean;
}

interface DescendantSlot {
  person: PersonFull | null;
  personId: string | null;
  loading: boolean;
  parentIdx: number; // index of parent in previous descendant gen (unused for gen 0)
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function PedigreeCanvas({
  treeSlug,
  focusPersonId,
  onPersonSelect,
  citizenshipMode,
}: {
  treeSlug: string;
  focusPersonId: string | null;
  onPersonSelect: (personId: string) => void;
  citizenshipMode: boolean;
}) {
  const [view, setView] = useState<CanvasView>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('heirloom:explorerView') as CanvasView) || 'pedigree';
    }
    return 'pedigree';
  });
  const [zoom, setZoom] = useState(1);
  const cache = useRef<Map<string, PersonFull>>(new Map());

  const [ancestorLevels, setAncestorLevels] = useState(5);
  const [descendantLevels, setDescendantLevels] = useState(1);

  // Ancestor tree: [gen][slot]. Gen 0: [focus], Gen 1: [father, mother], ...
  const [ancestors, setAncestors] = useState<AncestorSlot[][]>([]);
  const [descendants, setDescendants] = useState<DescendantSlot[][]>([]);
  const [focusPerson, setFocusPerson] = useState<PersonFull | null>(null);

  useEffect(() => {
    localStorage.setItem('heirloom:explorerView', view);
  }, [view]);

  const fetchPerson = useCallback(async (id: string): Promise<PersonFull | null> => {
    if (cache.current.has(id)) return cache.current.get(id)!;
    try {
      const res = await fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const data: PersonFull = await res.json();
      cache.current.set(id, data);
      return data;
    } catch {
      return null;
    }
  }, [treeSlug]);

  // Build ancestor tree when focusPersonId or ancestorLevels changes
  useEffect(() => {
    if (!focusPersonId) {
      setAncestors([]);
      setFocusPerson(null);
      return;
    }

    let cancelled = false;

    async function buildTree() {
      const focus = await fetchPerson(focusPersonId!);
      if (cancelled) return;
      if (!focus) {
        setAncestors([]);
        setFocusPerson(null);
        return;
      }
      setFocusPerson(focus);

      const gen0: AncestorSlot[] = [{ person: focus, personId: focus.id, loading: false }];
      const tree: AncestorSlot[][] = [gen0];
      setAncestors([gen0]);

      for (let genIdx = 1; genIdx <= ancestorLevels; genIdx++) {
        const prevGen = tree[genIdx - 1];
        const fetchTasks: Promise<AncestorSlot>[] = [];

        for (const slot of prevGen) {
          if (slot.person) {
            const { father, mother } = getParents(slot.person);
            if (father) {
              fetchTasks.push(
                fetchPerson(father.id).then(fetched => ({
                  person: fetched, personId: father.id, loading: false,
                }))
              );
            } else {
              fetchTasks.push(Promise.resolve({ person: null, personId: null, loading: false }));
            }
            if (mother) {
              fetchTasks.push(
                fetchPerson(mother.id).then(fetched => ({
                  person: fetched, personId: mother.id, loading: false,
                }))
              );
            } else {
              fetchTasks.push(Promise.resolve({ person: null, personId: null, loading: false }));
            }
          } else {
            fetchTasks.push(Promise.resolve({ person: null, personId: null, loading: false }));
            fetchTasks.push(Promise.resolve({ person: null, personId: null, loading: false }));
          }
        }

        const resolved = await Promise.all(fetchTasks);
        if (cancelled) return;
        tree[genIdx] = resolved;
        setAncestors(tree.map(g => [...g]));
      }
    }

    buildTree();
    return () => { cancelled = true; };
  }, [focusPersonId, fetchPerson, ancestorLevels]);

  // Build descendant tree when focusPerson or descendantLevels changes
  useEffect(() => {
    if (!focusPerson || descendantLevels === 0) {
      setDescendants([]);
      return;
    }

    let cancelled = false;

    async function buildDescendants() {
      const descTree: DescendantSlot[][] = [];

      // Gen 0: children of focus person
      const focusChildren = getChildren(focusPerson!);
      const gen0 = await Promise.all(
        focusChildren.map(async (child) => {
          const fetched = await fetchPerson(child.id);
          return { person: fetched, personId: child.id, loading: false, parentIdx: 0 } as DescendantSlot;
        })
      );
      if (cancelled) return;

      if (gen0.length === 0) {
        setDescendants([]);
        return;
      }

      descTree.push(gen0);
      setDescendants(descTree.map(g => [...g]));

      // Subsequent descendant generations
      for (let genIdx = 1; genIdx < descendantLevels; genIdx++) {
        const prevGen = descTree[genIdx - 1];
        const nextGenTasks: Promise<DescendantSlot>[] = [];

        for (let pi = 0; pi < prevGen.length; pi++) {
          const slot = prevGen[pi];
          if (slot.person) {
            const children = getChildren(slot.person);
            for (const child of children) {
              nextGenTasks.push(
                fetchPerson(child.id).then(fetched => ({
                  person: fetched, personId: child.id, loading: false, parentIdx: pi,
                }))
              );
            }
          }
        }

        const nextGen = await Promise.all(nextGenTasks);
        if (cancelled) return;

        if (nextGen.length > 0) {
          descTree.push(nextGen);
          setDescendants(descTree.map(g => [...g]));
        } else {
          break; // No more descendants to fetch
        }
      }
    }

    buildDescendants();
    return () => { cancelled = true; };
  }, [focusPerson, descendantLevels, fetchPerson]);

  const handleNodeClick = useCallback((personId: string) => {
    onPersonSelect(personId);
  }, [onPersonSelect]);

  const handleZoom = useCallback((delta: number) => {
    setZoom(z => Math.min(1.5, Math.max(0.5, z + delta)));
  }, []);

  return (
    <div className="pedigree-canvas-root">
      {/* Toolbar */}
      <div className="pedigree-toolbar">
        <div className="view-switcher">
          {(['fan', 'pedigree', 'family'] as const).map(v => (
            <button
              key={v}
              className={`view-btn${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}
            >
              {v === 'fan' ? 'Fan' : v === 'pedigree' ? 'Pedigree' : 'Family'}
            </button>
          ))}
        </div>

        {view === 'pedigree' && (
          <>
            <div className="toolbar-sep" />
            <div className="level-control">
              <span className="level-label">Ancestors</span>
              <button
                className="level-btn"
                onClick={() => setAncestorLevels(l => Math.max(0, l - 1))}
                disabled={ancestorLevels <= 0}
              >
                &minus;
              </button>
              <span className="level-value">{ancestorLevels}</span>
              <button
                className="level-btn"
                onClick={() => setAncestorLevels(l => Math.min(8, l + 1))}
                disabled={ancestorLevels >= 8}
              >
                +
              </button>
            </div>
            <div className="level-control">
              <span className="level-label">Descendants</span>
              <button
                className="level-btn"
                onClick={() => setDescendantLevels(l => Math.max(0, l - 1))}
                disabled={descendantLevels <= 0}
              >
                &minus;
              </button>
              <span className="level-value">{descendantLevels}</span>
              <button
                className="level-btn"
                onClick={() => setDescendantLevels(l => Math.min(4, l + 1))}
                disabled={descendantLevels >= 4}
              >
                +
              </button>
            </div>
          </>
        )}
      </div>

      {/* Canvas area */}
      <div className="pedigree-canvas-area">
        <div
          className="pedigree-canvas-content"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {view === 'pedigree' && (
            <PedigreeView
              ancestors={ancestors}
              descendants={descendants}
              focusPersonId={focusPersonId}
              citizenshipMode={citizenshipMode}
              onNodeClick={handleNodeClick}
            />
          )}
          {view === 'family' && (
            <FamilyView
              focusPerson={focusPerson}
              focusPersonId={focusPersonId}
              citizenshipMode={citizenshipMode}
              onNodeClick={handleNodeClick}
            />
          )}
          {view === 'fan' && (
            <FanView
              ancestors={ancestors}
              focusPersonId={focusPersonId}
              onNodeClick={handleNodeClick}
            />
          )}
        </div>

        {/* Zoom controls */}
        <div className="pedigree-zoom-controls">
          <button className="pedigree-zoom-btn" onClick={() => handleZoom(0.1)} title="Zoom in">+</button>
          <button className="pedigree-zoom-btn" onClick={() => handleZoom(-0.1)} title="Zoom out">−</button>
          <button className="pedigree-zoom-btn" onClick={() => setZoom(1)} title="Reset zoom">⊙</button>
        </div>

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
  );
}

// ── Person node component ───────────────────────────────────────────────────
function PersonNode({
  person,
  isSelected,
  isPhantom,
  citizenshipMode,
  onClick,
  compact,
}: {
  person: PersonRelation | null;
  isSelected?: boolean;
  isPhantom?: boolean;
  citizenshipMode?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  if (isPhantom || !person) {
    return (
      <div
        className="pnode pnode-phantom"
        onClick={onClick}
        style={compact ? { minWidth: 160, padding: '7px 10px' } : undefined}
      >
        <div className="pnode-name" style={{ color: '#9a8a7a' }}>—</div>
      </div>
    );
  }

  const status = citizenshipMode ? getCitizenshipStatus(person.id) : null;

  return (
    <div
      className={`pnode${isSelected ? ' pnode-selected' : ''}${status ? ` pnode-cit-${status}` : ''}`}
      onClick={onClick}
      style={compact ? { minWidth: 160, padding: '7px 10px' } : undefined}
    >
      <div className="pnode-name">{cleanName(person.name)}</div>
      <div className="pnode-dates">{formatDates(person)}</div>
      {person.birthPlace && !compact && (
        <div className="pnode-place">{shortPlace(person.birthPlace)}</div>
      )}
      {status && (
        <span className={`pnode-status-dot pnode-dot-${status}`} />
      )}
    </div>
  );
}

// ── PEDIGREE VIEW ───────────────────────────────────────────────────────────
function PedigreeView({
  ancestors,
  descendants,
  focusPersonId,
  citizenshipMode,
  onNodeClick,
}: {
  ancestors: AncestorSlot[][];
  descendants: DescendantSlot[][];
  focusPersonId: string | null;
  citizenshipMode: boolean;
  onNodeClick: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[]>([]);

  // Calculate connector lines after layout
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const timer = setTimeout(() => {
      const newLines: typeof lines = [];
      const containerRect = container.getBoundingClientRect();

      const getNodeEdges = (selector: string) => {
        const el = container.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          cy: rect.top + rect.height / 2 - containerRect.top,
        };
      };

      // ── Ancestor connectors (focus RIGHT → ancestors) ──
      for (let gen = 0; gen < ancestors.length - 1; gen++) {
        const parentGen = ancestors[gen];
        const childGen = ancestors[gen + 1];
        if (!parentGen || !childGen) continue;

        for (let pi = 0; pi < parentGen.length; pi++) {
          const fatherIdx = pi * 2;
          const motherIdx = pi * 2 + 1;

          const parentNode = gen === 0
            ? getNodeEdges('[data-section="focus"]')
            : getNodeEdges(`[data-section="anc"][data-gen="${gen}"][data-slot="${pi}"]`);

          if (!parentNode) continue;

          for (const childIdx of [fatherIdx, motherIdx]) {
            const childNode = getNodeEdges(`[data-section="anc"][data-gen="${gen + 1}"][data-slot="${childIdx}"]`);
            if (!childNode) continue;

            const px = parentNode.right;
            const py = parentNode.cy;
            const cx = childNode.left;
            const cy = childNode.cy;
            const mx = (px + cx) / 2;

            newLines.push({ x1: px, y1: py, x2: mx, y2: py });
            newLines.push({ x1: mx, y1: py, x2: mx, y2: cy });
            newLines.push({ x1: mx, y1: cy, x2: cx, y2: cy });

            const childSlot = childGen[childIdx];
            if (!childSlot?.person) {
              newLines[newLines.length - 1].dashed = true;
            }
          }
        }
      }

      // ── Descendant connectors (focus LEFT → descendants) ──
      for (let gen = 0; gen < descendants.length; gen++) {
        const descGen = descendants[gen];
        if (!descGen || descGen.length === 0) continue;

        // Group children by their parent
        const groups = new Map<string, number[]>();
        for (let si = 0; si < descGen.length; si++) {
          // For gen 0, all share the focus person as parent
          const parentKey = gen === 0 ? 'focus' : `desc-${gen - 1}-${descGen[si].parentIdx}`;
          if (!groups.has(parentKey)) groups.set(parentKey, []);
          groups.get(parentKey)!.push(si);
        }

        for (const [parentKey, childSlotIdxs] of groups) {
          const parentNode = parentKey === 'focus'
            ? getNodeEdges('[data-section="focus"]')
            : getNodeEdges(`[data-section="desc"][data-gen="${parentKey.split('-')[1]}"][data-slot="${parentKey.split('-')[2]}"]`);

          if (!parentNode) continue;

          const childNodes = childSlotIdxs
            .map(si => ({
              si,
              edges: getNodeEdges(`[data-section="desc"][data-gen="${gen}"][data-slot="${si}"]`),
            }))
            .filter((c): c is { si: number; edges: NonNullable<ReturnType<typeof getNodeEdges>> } => !!c.edges);

          if (childNodes.length === 0) continue;

          const px = parentNode.left;
          const py = parentNode.cy;
          const mx = (px + childNodes[0].edges.right) / 2;

          // Horizontal from parent to bus
          newLines.push({ x1: px, y1: py, x2: mx, y2: py });

          // Vertical bus
          const ys = childNodes.map(c => c.edges.cy);
          const minY = Math.min(py, ...ys);
          const maxY = Math.max(py, ...ys);
          if (minY !== maxY) {
            newLines.push({ x1: mx, y1: minY, x2: mx, y2: maxY });
          }

          // Horizontal from bus to each child
          for (const childNode of childNodes) {
            newLines.push({ x1: mx, y1: childNode.edges.cy, x2: childNode.edges.right, y2: childNode.edges.cy });
          }
        }
      }

      setLines(newLines);
    }, 50);

    return () => clearTimeout(timer);
  }, [ancestors, descendants]);

  if (ancestors.length === 0) {
    return (
      <div className="pedigree-empty">
        <p>Loading pedigree...</p>
      </div>
    );
  }

  const ancGap = 80;
  const descGap = 80;

  const getAncVGap = (gen: number) => {
    if (gen <= 1) return 120;
    if (gen === 2) return 40;
    if (gen === 3) return 24;
    return Math.max(4, 16 - (gen - 4) * 3);
  };

  const getDescVGap = (gen: number) => {
    if (gen === 0) return 40;
    if (gen === 1) return 24;
    return Math.max(4, 16 - (gen - 2) * 3);
  };

  return (
    <div className="pedigree-view-container" ref={containerRef}>
      <svg className="pedigree-connectors">
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="#e8e0d8"
            strokeWidth={2}
            strokeDasharray={l.dashed ? '4' : undefined}
          />
        ))}
      </svg>

      <div className="pedigree-columns">
        {/* Descendant columns (furthest gen first, then closer to focus) */}
        {[...descendants].reverse().map((gen, revIdx) => {
          const genIdx = descendants.length - 1 - revIdx;
          return (
            <div
              key={`desc-${genIdx}`}
              className="pedigree-column"
              style={{ gap: getDescVGap(genIdx), marginRight: descGap }}
            >
              {gen.map((slot, slotIdx) => (
                <div
                  key={`desc-${genIdx}-${slotIdx}`}
                  data-section="desc"
                  data-gen={genIdx}
                  data-slot={slotIdx}
                >
                  <PersonNode
                    person={slot.person}
                    isSelected={slot.personId === focusPersonId}
                    isPhantom={!slot.person}
                    citizenshipMode={citizenshipMode}
                    onClick={() => slot.personId && onNodeClick(slot.personId)}
                    compact={genIdx >= 1}
                  />
                </div>
              ))}
            </div>
          );
        })}

        {/* Focus person column */}
        <div className="pedigree-column" style={{ gap: 0 }}>
          {ancestors[0]?.map((slot, slotIdx) => (
            <div
              key={`focus-${slotIdx}`}
              data-section="focus"
              data-slot={slotIdx}
            >
              <PersonNode
                person={slot.person}
                isSelected={slot.personId === focusPersonId}
                citizenshipMode={citizenshipMode}
                onClick={() => slot.personId && onNodeClick(slot.personId)}
              />
            </div>
          ))}
        </div>

        {/* Ancestor columns */}
        {ancestors.slice(1).map((gen, idx) => {
          const genIdx = idx + 1;
          return (
            <div
              key={`anc-${genIdx}`}
              className="pedigree-column"
              style={{ gap: getAncVGap(genIdx), marginLeft: ancGap }}
            >
              {gen.map((slot, slotIdx) => (
                <div
                  key={`anc-${genIdx}-${slotIdx}`}
                  data-section="anc"
                  data-gen={genIdx}
                  data-slot={slotIdx}
                >
                  {slot.loading ? (
                    <div className="pnode pnode-loading">
                      <div className="pnode-name" style={{ color: '#9a8a7a' }}>Loading...</div>
                    </div>
                  ) : (
                    <PersonNode
                      person={slot.person}
                      isSelected={slot.personId === focusPersonId}
                      isPhantom={!slot.person}
                      citizenshipMode={citizenshipMode}
                      onClick={() => slot.personId && onNodeClick(slot.personId)}
                      compact={genIdx >= 3}
                    />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FAMILY VIEW ─────────────────────────────────────────────────────────────
function FamilyView({
  focusPerson,
  focusPersonId,
  citizenshipMode,
  onNodeClick,
}: {
  focusPerson: PersonFull | null;
  focusPersonId: string | null;
  citizenshipMode: boolean;
  onNodeClick: (id: string) => void;
}) {
  if (!focusPerson) {
    return (
      <div className="pedigree-empty">
        <p>Loading family view...</p>
      </div>
    );
  }

  const { father, mother } = getParents(focusPerson);
  const spouses = getSpouses(focusPerson);
  const children = getChildren(focusPerson);
  const nameClean = cleanName(focusPerson.name);

  return (
    <div className="family-view-container">
      {/* Parents row */}
      {(father || mother) && (
        <>
          <div className="family-row">
            {father ? (
              <div className="family-node-wrap">
                <div className="family-role-label">Father</div>
                <PersonNode
                  person={father}
                  citizenshipMode={citizenshipMode}
                  onClick={() => onNodeClick(father.id)}
                />
              </div>
            ) : (
              <div className="family-node-wrap">
                <div className="family-role-label">Father</div>
                <PersonNode person={null} isPhantom />
              </div>
            )}
            <div className="family-h-line" />
            <div className="family-marriage-badge">married</div>
            <div className="family-h-line" />
            {mother ? (
              <div className="family-node-wrap">
                <div className="family-role-label">Mother</div>
                <PersonNode
                  person={mother}
                  citizenshipMode={citizenshipMode}
                  onClick={() => onNodeClick(mother.id)}
                />
              </div>
            ) : (
              <div className="family-node-wrap">
                <div className="family-role-label">Mother</div>
                <PersonNode person={null} isPhantom />
              </div>
            )}
          </div>
          <div className="family-v-connector" />
        </>
      )}

      {/* Focus person + spouse */}
      <div className="family-row">
        <div className="family-node-wrap">
          {!father && !mother && <div className="family-role-label" style={{ visibility: 'hidden' }}>_</div>}
          <PersonNode
            person={focusPerson}
            isSelected
            citizenshipMode={citizenshipMode}
            onClick={() => {}}
          />
        </div>
        {spouses.length > 0 && (
          <>
            <div className="family-h-line" />
            <div className="family-marriage-badge">spouse</div>
            <div className="family-h-line" />
            <div className="family-node-wrap">
              <PersonNode
                person={spouses[0]}
                citizenshipMode={citizenshipMode}
                onClick={() => onNodeClick(spouses[0].id)}
              />
            </div>
          </>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && (
        <>
          <div className="family-v-connector" />
          <div className="family-children-row">
            {children.map(c => (
              <div key={c.id} className="family-child-col">
                <div className="family-v-connector-short" />
                <PersonNode
                  person={c}
                  citizenshipMode={citizenshipMode}
                  onClick={() => onNodeClick(c.id)}
                  compact
                />
              </div>
            ))}
          </div>
        </>
      )}

      {children.length === 0 && (
        <div className="family-no-children">
          <div className="family-v-connector" />
          <span>No children recorded</span>
        </div>
      )}

      <div className="family-hint">
        Click any person to re-center the tree on them.
        Currently viewing: <strong>{nameClean}</strong>
      </div>
    </div>
  );
}

// ── FAN VIEW ────────────────────────────────────────────────────────────────
function FanView({
  ancestors,
  focusPersonId,
  onNodeClick,
}: {
  ancestors: AncestorSlot[][];
  focusPersonId: string | null;
  onNodeClick: (id: string) => void;
}) {
  if (ancestors.length === 0 || !ancestors[0]?.[0]?.person) {
    return (
      <div className="pedigree-empty">
        <p>Loading fan chart...</p>
      </div>
    );
  }

  const focus = ancestors[0][0].person!;
  const focusName = cleanName(focus.name);
  const nameParts = focusName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // Build arc segments for each generation
  const genRadii = [
    { inner: 50, outer: 90 },   // Gen 1: parents
    { inner: 100, outer: 150 },  // Gen 2: grandparents
    { inner: 160, outer: 220 },  // Gen 3: great-grandparents
  ];

  function arcPath(
    cx: number, cy: number,
    innerR: number, outerR: number,
    startAngle: number, endAngle: number,
  ): string {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + innerR * Math.cos(toRad(startAngle));
    const y1 = cy + innerR * Math.sin(toRad(startAngle));
    const x2 = cx + innerR * Math.cos(toRad(endAngle));
    const y2 = cy + innerR * Math.sin(toRad(endAngle));
    const x3 = cx + outerR * Math.cos(toRad(endAngle));
    const y3 = cy + outerR * Math.sin(toRad(endAngle));
    const x4 = cx + outerR * Math.cos(toRad(startAngle));
    const y4 = cy + outerR * Math.sin(toRad(startAngle));
    const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${innerR} ${innerR} 0 ${largeArc} 1 ${x2} ${y2}
            L ${x3} ${y3} A ${outerR} ${outerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  function midAngle(startAngle: number, endAngle: number) {
    return (startAngle + endAngle) / 2;
  }

  const cx = 300;
  const cy = 280;
  const segments: { path: string; person: PersonRelation | null; id: string | null; textX: number; textY: number; textAngle: number; genIdx: number }[] = [];

  for (let genIdx = 1; genIdx <= 3; genIdx++) {
    const gen = ancestors[genIdx];
    if (!gen) continue;
    const { inner, outer } = genRadii[genIdx - 1];
    const count = gen.length; // 2, 4, 8
    const totalAngle = 180;
    const sliceAngle = totalAngle / count;

    for (let i = 0; i < count; i++) {
      const startAngle = 180 + i * sliceAngle; // 180° = left, going clockwise up
      const endAngle = startAngle + sliceAngle;
      const mid = midAngle(startAngle, endAngle);
      const textR = (inner + outer) / 2;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const textX = cx + textR * Math.cos(toRad(mid));
      const textY = cy + textR * Math.sin(toRad(mid));

      segments.push({
        path: arcPath(cx, cy, inner, outer, startAngle, endAngle),
        person: gen[i]?.person ?? null,
        id: gen[i]?.personId ?? null,
        textX,
        textY,
        textAngle: mid + 90, // rotate text to be readable
        genIdx,
      });
    }
  }

  const genColors = ['#f0ebe3', '#e8e0d8', '#f0ebe3'];

  return (
    <div className="fan-view-container">
      <svg viewBox="0 0 600 300" width="600" height="300" className="fan-svg">
        {/* Generation arcs background */}
        {genRadii.map((r, i) => (
          <path
            key={`bg-${i}`}
            d={arcPath(cx, cy, r.inner, r.outer, 180, 360)}
            fill={genColors[i]}
            stroke="#e8e0d8"
            strokeWidth={0.5}
          />
        ))}

        {/* Segment dividers and text */}
        {segments.map((seg, i) => (
          <g key={i}>
            <path
              d={seg.path}
              fill={seg.person ? (seg.id === focusPersonId ? '#fdf6ef' : 'transparent') : 'transparent'}
              stroke="#e8e0d8"
              strokeWidth={1}
              style={{ cursor: seg.id ? 'pointer' : 'default' }}
              onClick={() => seg.id && onNodeClick(seg.id)}
            />
            {seg.person && (
              <text
                x={seg.textX}
                y={seg.textY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={seg.genIdx === 3 ? 7 : seg.genIdx === 2 ? 8 : 9}
                fontWeight={500}
                fill="#2c1810"
                style={{ cursor: seg.id ? 'pointer' : 'default', pointerEvents: 'none' }}
              >
                {cleanName(seg.person.name).split(' ')[0]}
              </text>
            )}
            {!seg.person && (
              <text
                x={seg.textX}
                y={seg.textY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fill="#c8b8a8"
                style={{ pointerEvents: 'none' }}
              >
                —
              </text>
            )}
          </g>
        ))}

        {/* Center: focus person */}
        <circle cx={cx} cy={cy} r={40} fill="white" stroke="#8b5e3c" strokeWidth={2} />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#2c1810">
          {firstName}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fill="#9a8a7a">
          {lastName}
        </text>

        {/* Gen labels */}
        <text x={20} y={cy - 65} fontSize={9} fill="#9a8a7a">Parents</text>
        <text x={20} y={cy - 120} fontSize={9} fill="#9a8a7a">Grandparents</text>
        <text x={20} y={cy - 185} fontSize={9} fill="#9a8a7a">Great-Grand.</text>
      </svg>
      <div className="fan-hint">Click any segment to navigate</div>
    </div>
  );
}
