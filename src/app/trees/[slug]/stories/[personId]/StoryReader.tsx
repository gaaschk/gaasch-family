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

  return (
    <div className="story-page">
      {/* Header */}
      <header className="story-header">
        <nav style={{ marginBottom: '1.5rem' }}>
          <a
            href={`/trees/${treeSlug}`}
            style={{
              fontFamily: 'var(--font-sc)',
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              color: 'var(--sepia)',
              textDecoration: 'none',
            }}
          >
            ← {treeName}
          </a>
        </nav>

        <h1>{personName}</h1>

        {(firstYear || lastYear || lineage.length > 0) && (
          <p className="story-meta">
            {lineage.length > 0 && `${lineage.length} generation${lineage.length !== 1 ? 's' : ''}`}
            {lineage.length > 0 && (firstYear || lastYear) && ' · '}
            {firstYear && lastYear && firstYear !== lastYear
              ? `${firstYear} – ${lastYear}`
              : firstYear
              ? `${firstYear}`
              : lastYear
              ? `${lastYear}`
              : ''}
          </p>
        )}

        {lineage.length > 0 && (
          <div className="story-lineage-path">
            {lineage.map((p, i) => (
              <span key={p.id} style={{ opacity: i === lineage.length - 1 ? 1 : 0.7 }}>
                {cleanName(p.name)}
                {i < lineage.length - 1 && (
                  <span style={{ display: 'block', textAlign: 'center', color: 'var(--gold)', fontSize: '0.7rem', margin: '0.1rem 0' }}>↓</span>
                )}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="story-body">
        {html ? (
          <>
            {generating && (
              <p style={{ color: 'var(--sepia)', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                Generating…
              </p>
            )}
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </>
        ) : generating ? (
          <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>
            Generating {firstName}&rsquo;s story&hellip;
          </p>
        ) : canEdit ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--sepia)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
              This story hasn&rsquo;t been written yet.
            </p>
            <button
              onClick={() => generateStory()}
              className="btn btn-primary"
            >
              Generate Story
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--sepia)', fontStyle: 'italic' }}>
              This story hasn&rsquo;t been written yet. Check back later.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="story-footer">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {html && !generating && (
            <button onClick={downloadPdf} className="btn btn-secondary btn-sm">
              Download PDF
            </button>
          )}
          {canEdit && html && !generating && (
            <button onClick={() => generateStory(true)} className="btn btn-secondary btn-sm">
              Regenerate
            </button>
          )}
        </div>
        <a
          href={`/trees/${treeSlug}`}
          style={{
            fontFamily: 'var(--font-sc)',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: 'var(--sepia)',
            textDecoration: 'none',
          }}
        >
          Back to tree
        </a>
      </footer>
    </div>
  );
}
