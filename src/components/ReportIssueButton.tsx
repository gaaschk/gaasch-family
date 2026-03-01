'use client';

import { useState, useEffect, useRef } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ReportIssueButton() {
  const [open, setOpen]               = useState(false);
  const [type, setType]               = useState('bug');
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus]           = useState<Status>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [issueUrl, setIssueUrl]       = useState('');
  const [issueNumber, setIssueNumber] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 50);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function reset() {
    setType('bug');
    setTitle('');
    setDescription('');
    setStatus('idle');
    setErrorMsg('');
    setIssueUrl('');
    setIssueNumber(0);
  }

  function handleClose() {
    setOpen(false);
    if (status === 'success') reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || status === 'submitting') return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/report-issue', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type,
          title:       title.trim(),
          description: description.trim(),
          pageUrl:     window.location.href,
        }),
      });

      let data: { ok?: boolean; error?: string; url?: string; number?: number } = {};
      try { data = await res.json(); } catch { /* non-JSON body (proxy error) */ }

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? `Server error (${res.status}). Please try again.`);
        setStatus('error');
        return;
      }

      setIssueUrl(data.url ?? '');
      setIssueNumber(data.number ?? 0);
      setStatus('success');
    } catch {
      setErrorMsg('Could not connect to the server. Please try again.');
      setStatus('error');
    }
  }

  const typeOptions = [
    { value: 'bug',     label: 'Bug report' },
    { value: 'feature', label: 'Feature request' },
    { value: 'other',   label: 'Other' },
  ];

  return (
    <>
      {/* ── Floating toggle button ── */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) reset(); }}
        aria-label="Report an issue"
        title="Report an issue"
        style={{
          position:       'fixed',
          bottom:         '1.75rem',
          left:           '1.75rem',
          zIndex:         950,
          width:          44,
          height:         44,
          borderRadius:   '50%',
          background:     'var(--ink, #1a1a1a)',
          border:         '1.5px solid var(--sepia-light, #8b7355)',
          color:          'var(--sepia-light, #8b7355)',
          fontSize:       '1rem',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          boxShadow:      '0 2px 8px rgba(0,0,0,0.25)',
          opacity:        0.75,
          transition:     'opacity 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold, #c4962a)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold, #c4962a)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sepia-light, #8b7355)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sepia-light, #8b7355)'; }}
      >
        ⚑
      </button>

      {/* ── Modal overlay ── */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
          style={{
            position:        'fixed',
            inset:           0,
            zIndex:          1000,
            background:      'rgba(0,0,0,0.45)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            padding:         '1rem',
          }}
        >
          <div
            style={{
              background:   'var(--parchment, #f5f0e8)',
              border:       '1px solid var(--border-light, #d4c9b0)',
              borderRadius: 10,
              width:        '100%',
              maxWidth:     480,
              boxShadow:    '0 8px 40px rgba(0,0,0,0.3)',
              overflow:     'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                background:   'var(--ink, #1a1a1a)',
                borderBottom: '1px solid var(--sepia-light, #8b7355)',
                padding:      '0.85rem 1.25rem',
                display:      'flex',
                alignItems:   'center',
                gap:          '0.6rem',
              }}
            >
              <span style={{ color: 'var(--sepia-light, #8b7355)', fontSize: '0.95rem' }}>⚑</span>
              <span
                style={{
                  color:         'var(--parchment, #f5f0e8)',
                  fontFamily:    'var(--font-sc, serif)',
                  fontSize:      '0.72rem',
                  letterSpacing: '0.1em',
                  flex:          1,
                }}
              >
                Report an Issue
              </span>
              <button
                onClick={handleClose}
                style={{
                  background:  'none',
                  border:      'none',
                  color:       'var(--sepia-light, #8b7355)',
                  fontSize:    '1.1rem',
                  cursor:      'pointer',
                  lineHeight:  1,
                  padding:     '0.1rem 0.25rem',
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem' }}>
              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>✓</p>
                  <p style={{ fontFamily: 'var(--font-sc, serif)', fontSize: '0.85rem', color: 'var(--ink, #1a1a1a)', marginBottom: '0.4rem' }}>
                    Issue #{issueNumber} created
                  </p>
                  {issueUrl && (
                    <a
                      href={issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', color: 'var(--sepia, #6b5a3e)', wordBreak: 'break-all' }}
                    >
                      View on GitHub →
                    </a>
                  )}
                  <div style={{ marginTop: '1.25rem' }}>
                    <button
                      onClick={handleClose}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="issue-type">Type</label>
                    <select
                      id="issue-type"
                      className="form-select"
                      value={type}
                      onChange={e => setType(e.target.value)}
                      disabled={status === 'submitting'}
                    >
                      {typeOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="issue-title">Title</label>
                    <input
                      ref={titleRef}
                      id="issue-title"
                      type="text"
                      className="form-input"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Brief summary of the issue"
                      disabled={status === 'submitting'}
                      maxLength={200}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="issue-desc">Description</label>
                    <textarea
                      id="issue-desc"
                      className="form-input"
                      rows={5}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Steps to reproduce, expected vs. actual behaviour, or details about your request…"
                      disabled={status === 'submitting'}
                      required
                      style={{ resize: 'vertical', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.875rem' }}
                    />
                  </div>

                  {status === 'error' && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--rust, #c0392b)', marginTop: '0.75rem', marginBottom: 0 }}>
                      {errorMsg}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleClose}
                      disabled={status === 'submitting'}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={status === 'submitting' || !title.trim() || !description.trim()}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {status === 'submitting' ? 'Submitting…' : 'Submit Issue'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
