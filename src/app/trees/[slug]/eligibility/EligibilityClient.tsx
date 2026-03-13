'use client';

import { useState, useEffect } from 'react';
import { generationLabel, checkRequirements } from '@/lib/eligibility';
import type { CountryResult, AncestorInfo, EligibilityStatus } from '@/lib/eligibility';

// Europe map blob positions (approximate, for visual representation)
const COUNTRY_POSITIONS: Record<string, { top: string; left: string; w: string; h: string }> = {
  'Finland':     { top: '2%',  left: '62%', w: '42px', h: '48px' },
  'Ireland':     { top: '22%', left: '10%', w: '28px', h: '30px' },
  'France':      { top: '42%', left: '22%', w: '48px', h: '44px' },
  'Spain':       { top: '60%', left: '14%', w: '52px', h: '38px' },
  'Portugal':    { top: '62%', left: '6%',  w: '22px', h: '34px' },
  'Germany':     { top: '30%', left: '38%', w: '42px', h: '38px' },
  'Italy':       { top: '50%', left: '42%', w: '30px', h: '48px' },
  'Austria':     { top: '38%', left: '44%', w: '34px', h: '20px' },
  'Poland':      { top: '28%', left: '52%', w: '40px', h: '32px' },
  'Czechia':     { top: '32%', left: '46%', w: '30px', h: '18px' },
  'Slovakia':    { top: '34%', left: '54%', w: '28px', h: '16px' },
  'Hungary':     { top: '40%', left: '54%', w: '32px', h: '20px' },
  'Romania':     { top: '42%', left: '62%', w: '38px', h: '28px' },
  'Bulgaria':    { top: '52%', left: '62%', w: '32px', h: '22px' },
  'Greece':      { top: '60%', left: '58%', w: '30px', h: '32px' },
  'Croatia':     { top: '42%', left: '48%', w: '28px', h: '22px' },
  'Slovenia':    { top: '40%', left: '46%', w: '22px', h: '14px' },
  'Latvia':      { top: '16%', left: '60%', w: '30px', h: '18px' },
  'Lithuania':   { top: '20%', left: '58%', w: '28px', h: '20px' },
  'Luxembourg':  { top: '36%', left: '32%', w: '16px', h: '14px' },
  'Malta':       { top: '74%', left: '48%', w: '14px', h: '12px' },
  'Cyprus':      { top: '70%', left: '76%', w: '20px', h: '14px' },
};

function statusBadge(status: EligibilityStatus) {
  switch (status) {
    case 'likely':       return { cls: 'elig-badge-green',  label: 'Strong' };
    case 'possible':     return { cls: 'elig-badge-yellow', label: 'Review' };
    case 'insufficient': return { cls: 'elig-badge-gray',   label: 'None' };
  }
}

function blobColor(status: EligibilityStatus) {
  switch (status) {
    case 'likely':       return 'elig-blob-green';
    case 'possible':     return 'elig-blob-yellow';
    case 'insufficient': return 'elig-blob-gray';
  }
}

export default function EligibilityClient({
  treeSlug,
  treeName,
}: {
  treeSlug: string;
  treeName: string;
}) {
  const [results, setResults] = useState<CountryResult[]>([]);
  const [totalPeople, setTotalPeople] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trees/${treeSlug}/eligibility`)
      .then(r => r.json())
      .then(data => {
        setResults(data.results ?? []);
        setTotalPeople(data.totalPeople ?? 0);
        // Auto-select first likely result
        const first = (data.results ?? [])[0];
        if (first) setSelected(first.country);
      })
      .finally(() => setLoading(false));
  }, [treeSlug]);

  const selectedResult = results.find(r => r.country === selected);
  const likely = results.filter(r => r.status === 'likely');
  const possible = results.filter(r => r.status === 'possible');
  const insufficient = results.filter(r => r.status === 'insufficient');

  const requirements = selectedResult
    ? checkRequirements(selectedResult.matchedRule, selectedResult.matchedAncestors, selectedResult.country)
    : [];

  if (loading) {
    return (
      <div className="elig-layout">
        <div className="elig-sidebar">
          <div className="elig-sidebar-header">
            <h2>Eligibility Results</h2>
            <p>Analyzing family tree...</p>
          </div>
        </div>
        <div className="elig-main">
          <div style={{ padding: '4rem 2rem', color: 'var(--sepia)', fontStyle: 'italic' }}>
            Loading eligibility analysis...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="elig-layout">
      {/* Sidebar */}
      <div className="elig-sidebar">
        <div className="elig-sidebar-header">
          <h2>Eligibility Results</h2>
          <p>Based on {treeName}</p>
        </div>

        {likely.length > 0 && (
          <>
            <div className="elig-section-label">Likely Eligible</div>
            {likely.map(r => (
              <CountryItem
                key={r.country}
                result={r}
                active={selected === r.country}
                onClick={() => setSelected(r.country)}
              />
            ))}
          </>
        )}

        {possible.length > 0 && (
          <>
            <div className="elig-section-label">Possible</div>
            {possible.map(r => (
              <CountryItem
                key={r.country}
                result={r}
                active={selected === r.country}
                onClick={() => setSelected(r.country)}
              />
            ))}
          </>
        )}

        {insufficient.length > 0 && (
          <>
            <div className="elig-section-label">No Path Found</div>
            {insufficient.map(r => (
              <CountryItem
                key={r.country}
                result={r}
                active={selected === r.country}
                onClick={() => setSelected(r.country)}
              />
            ))}
          </>
        )}
      </div>

      {/* Main */}
      <div className="elig-main">
        <div className="elig-page-header">
          <h1>Your EU Eligibility</h1>
          <p>Based on {totalPeople} people in {treeName}</p>
        </div>

        <div className="elig-stats-row">
          <div className="elig-stat-card">
            <div className="elig-stat-num green">{likely.length}</div>
            <div className="elig-stat-label">Likely eligible paths</div>
          </div>
          <div className="elig-stat-card">
            <div className="elig-stat-num yellow">{possible.length}</div>
            <div className="elig-stat-label">Possible paths to review</div>
          </div>
          <div className="elig-stat-card">
            <div className="elig-stat-num">{insufficient.length}</div>
            <div className="elig-stat-label">Need more data</div>
          </div>
        </div>

        {/* Map */}
        <div className="elig-map-card">
          <div className="elig-map-header">
            <h3>Europe Overview</h3>
            <div className="elig-map-legend">
              <span><span className="elig-legend-dot elig-dot-green" /> Likely</span>
              <span><span className="elig-legend-dot elig-dot-yellow" /> Possible</span>
              <span><span className="elig-legend-dot elig-dot-gray" /> Insufficient</span>
            </div>
          </div>
          <div className="elig-map-body">
            <div className="elig-europe-map">
              {results.map(r => {
                const pos = COUNTRY_POSITIONS[r.country];
                if (!pos) return null;
                return (
                  <div
                    key={r.country}
                    className={`elig-country-blob ${blobColor(r.status)} ${selected === r.country ? 'elig-blob-active' : ''}`}
                    style={{ top: pos.top, left: pos.left, width: pos.w, height: pos.h }}
                    onClick={() => setSelected(r.country)}
                    title={r.country}
                  >
                    {r.flag}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selectedResult && (
          <div className="elig-detail-card">
            <div className="elig-detail-header">
              <div className="elig-detail-country">
                <div className="elig-detail-flag">{selectedResult.flag}</div>
                <div>
                  <div className="elig-detail-name">{selectedResult.country}</div>
                  <div className="elig-detail-article">{selectedResult.notes}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`elig-badge ${statusBadge(selectedResult.status).cls}`}>
                  {statusBadge(selectedResult.status).label}
                </span>
              </div>
            </div>

            <div className="elig-detail-body">
              <div className="elig-detail-grid">
                {/* Lineage chain */}
                <div className="elig-detail-section">
                  <h4>Qualifying Lineage</h4>
                  {selectedResult.matchedAncestors.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--sepia)' }}>
                      No matching ancestors found for {selectedResult.country}.
                    </p>
                  ) : (
                    <div className="elig-lineage-chain">
                      {selectedResult.matchedAncestors.map((anc, i) => (
                        <ChainNode
                          key={anc.id}
                          ancestor={anc}
                          isLast={i === selectedResult.matchedAncestors.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="elig-detail-section">
                  <h4>Key Requirements</h4>
                  <div className="elig-requirement-list">
                    {requirements.map((req, i) => (
                      <div key={i} className="elig-req-item">
                        <div className={`elig-req-check ${req.met ? 'elig-req-check-yes' : 'elig-req-check-no'}`}>
                          {req.met ? '\u2713' : '\u2013'}
                        </div>
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CountryItem({ result, active, onClick }: { result: CountryResult; active: boolean; onClick: () => void }) {
  const badge = statusBadge(result.status);
  return (
    <div
      className={`elig-country-item ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="elig-country-top">
        <div className="elig-country-name">
          <span className="elig-country-flag">{result.flag}</span> {result.country}
        </div>
        <span className={`elig-badge ${badge.cls}`}>{badge.label}</span>
      </div>
      <div className="elig-country-path">{result.notes}</div>
    </div>
  );
}

function ChainNode({ ancestor, isLast }: { ancestor: AncestorInfo; isLast: boolean }) {
  const hasBirthPlace = !!ancestor.birthPlace;
  const dotClass = hasBirthPlace ? 'elig-chain-dot-filled' : 'elig-chain-dot-empty';

  return (
    <div className="elig-chain-node">
      <div className="elig-chain-line">
        <div className={`elig-chain-dot ${dotClass}`} />
        {!isLast && <div className="elig-chain-connector" />}
      </div>
      <div className="elig-chain-info">
        <div className="elig-chain-person">{ancestor.name}</div>
        <div className="elig-chain-detail">
          {ancestor.birthDate ? `b. ${ancestor.birthDate}` : ''}
          {ancestor.birthDate && ancestor.birthPlace ? ' \u00b7 ' : ''}
          {ancestor.birthPlace ?? ''}
          {(ancestor.birthDate || ancestor.birthPlace) ? ' \u00b7 ' : ''}
          {generationLabel(ancestor.generation)}
        </div>
      </div>
      <span className={`elig-chain-status ${hasBirthPlace ? 'elig-status-complete' : 'elig-status-missing'}`}>
        {hasBirthPlace ? '\u2713' : 'Missing'}
      </span>
    </div>
  );
}
