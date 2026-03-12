'use client';

import { useState } from 'react';

interface LineagePerson {
  id: string;
  name: string;
  birthDate: string | null;
  deathDate: string | null;
}

interface Props {
  treeSlug: string;
  treeName: string;
  person: { id: string; name: string; birthDate: string | null; deathDate: string | null };
  story: { html: string; updatedAt: string } | null;
  lineage: LineagePerson[];
  canEdit: boolean;
  personId: string;
}

function cleanName(name: string) {
  return name.replace(/\//g, '').replace(/\s+/g, ' ').trim();
}

function extractYear(date: string | null): number | null {
  if (!date) return null;
  const m = date.match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

export default function StoryReader({
  treeSlug,
  treeName,
  person,
  story,
  lineage,
  canEdit,
  personId,
}: Props) {
  const [html, setHtml] = useState(story?.html ?? '');
  const [generating, setGenerating] = useState(false);

  const personName = cleanName(person.name);
  const firstName = personName.split(' ')[0];

  // Compute meta from lineage
  const years = lineage
    .flatMap(p => [extractYear(p.birthDate), extractYear(p.deathDate)])
    .filter((y): y is number => y !== null);
  const firstYear = years.length > 0 ? Math.min(...years) : null;
  const lastYear  = years.length > 0 ? Math.max(...years) : null;

  async function generateStory(force = false) {
    setGenerating(true);
    if (force) setHtml('');

    try {
      // If no lineage loaded, fetch pathToRoot first
      let personIds: string[];
      if (lineage.length > 0) {
        personIds = lineage.map(p => p.id);
      } else {
        const res = await fetch(`/api/trees/${treeSlug}/people/${encodeURIComponent(personId)}`);
        if (!res.ok) {
          setHtml('<p class="body-text">Could not load lineage data.</p>');
          return;
        }
        const data = await res.json() as { pathToRoot?: { id: string }[] };
        personIds = (data.pathToRoot ?? []).map((n: { id: string }) => n.id);
        if (personIds.length === 0) personIds = [personId];
      }

      const res = await fetch(`/api/trees/${treeSlug}/generate-lineage-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personIds }),
      });

      if (!res.ok || !res.body) {
        setHtml('<p class="body-text">Failed to generate story.</p>');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setHtml(accumulated);
      }
      accumulated = accumulated
        .replace(/^```(?:html)?\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      setHtml(accumulated);
    } finally {
      setGenerating(false);
    }
  }

  function downloadPdf() {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${personName} — ${treeName}</title>
  <style>
    body{font-family:Georgia,serif;max-width:700px;margin:2cm auto;color:#1a1208;line-height:1.7;font-size:11pt}
    .section-title{font-variant:small-caps;letter-spacing:.1em;font-size:1.05rem;color:#7a5c2e;margin:2rem 0 .5rem;font-weight:normal}
    .body-text{margin:0 0 1rem}
    .latin-quote{font-style:italic;color:#7a5c2e;border-left:2px solid #c4962a;padding-left:1rem;margin:1.25rem 0}
    .pull-quote{font-size:1.1rem;font-style:italic;text-align:center;border-top:1px solid #c4962a;border-bottom:1px solid #c4962a;padding:.75rem 1.5rem;margin:1.5rem 0}
    @media print{body{margin:0}}
  </style>
</head>
<body>${html}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  }

  const timeSpan = firstYear && lastYear && firstYear !== lastYear
    ? `${firstYear} – ${lastYear}`
    : firstYear ? `${firstYear}` : lastYear ? `${lastYear}` : '';

  return (
    <div className="story-page">
      {/* Nav bar */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #e8e0d8', padding: '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <a href="/home" style={{ fontSize: 20, fontWeight: 700, color: '#2c1810', letterSpacing: -0.5, textDecoration: 'none' }}>
          heir<span style={{ color: '#8b5e3c' }}>loom</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href={`/trees/${treeSlug}`} style={{ fontSize: 13, color: '#7a6a5a', textDecoration: 'none', padding: '5px 12px', borderRadius: 6 }}>
            Explorer
          </a>
          <span style={{ fontSize: 12, color: '#9a8a7a' }}>{treeName}</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="story-hero">
        <div className="story-hero-inner">
          <div className="story-hero-eyebrow">Ancestry Story</div>
          <h1>{personName}</h1>
          {(timeSpan || lineage.length > 0) && (
            <div className="story-hero-meta">
              {lineage.length > 0 && (
                <div className="story-hero-meta-item">
                  <strong>{lineage.length} generation{lineage.length !== 1 ? 's' : ''}</strong>
                  of family history
                </div>
              )}
              {timeSpan && (
                <div className="story-hero-meta-item">
                  <strong>{timeSpan}</strong>
                  span of records
                </div>
              )}
            </div>
          )}
          {(html || canEdit) && (
            <div className="story-hero-actions">
              {canEdit && html && !generating && (
                <button onClick={() => generateStory(true)} className="btn btn-ghost btn-sm">Regenerate</button>
              )}
              {html && !generating && (
                <button onClick={downloadPdf} className="btn btn-ghost btn-sm">Print / PDF</button>
              )}
              <a href={`/trees/${treeSlug}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Back to tree</a>
            </div>
          )}
        </div>
      </div>

      {/* Story layout */}
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: 32, display: 'grid', gridTemplateColumns: lineage.length > 1 ? '1fr 280px' : '1fr', gap: 28 }}>
        {/* Story content */}
        <div>
          <div className="story-content-card">
            <div className="story-body" style={{ maxWidth: 'none', padding: '40px 48px' }}>
              {html ? (
                <>
                  {generating && (
                    <div style={{
                      background: '#fff8e6', border: '1px solid #f5d87a', borderRadius: 8,
                      padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center',
                      gap: 10, fontSize: 13, color: '#7a5a00',
                    }}>
                      Generating story...
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                </>
              ) : generating ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <p style={{ color: '#7a6a5a', fontSize: 14 }}>
                    Generating {firstName}&rsquo;s story&hellip;
                  </p>
                </div>
              ) : canEdit ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2c1810', marginBottom: 4 }}>
                    This story hasn&rsquo;t been written yet
                  </p>
                  <p style={{ fontSize: 13, color: '#7a6a5a', marginBottom: 20 }}>
                    Generate an AI-written narrative of {firstName}&rsquo;s family history.
                  </p>
                  <button onClick={() => generateStory()} className="btn btn-primary">
                    Generate Story
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <p style={{ color: '#7a6a5a', fontSize: 14 }}>
                    This story hasn&rsquo;t been written yet. Check back later.
                  </p>
                </div>
              )}
            </div>

            {html && !generating && (
              <div style={{
                padding: '20px 48px', borderTop: '1px solid #f0ebe3', background: '#fdf6ef',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: 12, color: '#9a8a7a',
              }}>
                <span>Generated by Heirloom AI</span>
                <a href={`/trees/${treeSlug}`} style={{ color: '#8b5e3c', textDecoration: 'none', fontSize: 13 }}>
                  ← Back to tree
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: lineage timeline */}
        {lineage.length > 1 && (
          <div>
            <div style={{
              background: 'white', borderRadius: 12, border: '1px solid #e8e0d8',
              overflow: 'hidden', position: 'sticky', top: 72,
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ebe3', fontSize: 13, fontWeight: 600, color: '#2c1810' }}>
                Lineage
              </div>
              {lineage.map((p, i) => {
                const year = extractYear(p.birthDate);
                return (
                  <div key={p.id} style={{
                    padding: '12px 16px', borderBottom: i < lineage.length - 1 ? '1px solid #f7f4f0' : 'none',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i === 0 ? '#8b5e3c' : '#c8b8a8',
                      marginTop: 4, flexShrink: 0,
                    }} />
                    <div>
                      {year && <div style={{ fontSize: 12, fontWeight: 600, color: '#8b5e3c' }}>{year}</div>}
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#2c1810', marginTop: 1 }}>
                        {cleanName(p.name)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
