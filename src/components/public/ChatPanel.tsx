'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;       // HTML for assistant, plain text for user
  statuses: string[];    // status lines shown above the message
}

export default function ChatPanel({
  treeSlug,
  currentPersonId,
  onNavigateTo,
  onMatchesSearched,
}: {
  treeSlug: string;
  currentPersonId: string | null;
  onNavigateTo: (id: string) => void;
  onMatchesSearched?: (personId: string) => void;
}) {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text, statuses: [] };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);

    // Placeholder assistant message we'll update in-place
    const assistantMsg: Message = { role: 'assistant', content: '', statuses: [] };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const res = await fetch(`/api/trees/${treeSlug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          currentPersonId,
        }),
      });

      if (!res.ok || !res.body) {
        let errMsg = 'Something went wrong. Please try again.';
        try {
          const errBody = await res.json() as { error?: string };
          if (errBody.error) errMsg = errBody.error;
        } catch { /* ignore */ }
        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: `<p class="body-text" style="color:var(--rust)">${errMsg}</p>` };
          return copy;
        });
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as { t: string; v?: string };
            if (evt.t === 's') {
              // Status update
              setMessages(prev => {
                const copy = [...prev];
                const last = { ...copy[copy.length - 1] };
                last.statuses = [...last.statuses, evt.v!];
                copy[copy.length - 1] = last;
                return copy;
              });
            } else if (evt.t === 'd') {
              // Final text
              setMessages(prev => {
                const copy = [...prev];
                const last = { ...copy[copy.length - 1] };
                last.content = last.content + (evt.v ?? '');
                copy[copy.length - 1] = last;
                return copy;
              });
            } else if (evt.t === 'm') {
              // External match search completed — notify parent to re-fetch hints
              if (evt.v) onMatchesSearched?.(evt.v);
            } else if (evt.t === 'e') {
              setMessages(prev => {
                const copy = [...prev];
                const last = { ...copy[copy.length - 1] };
                last.content = `<p class="body-text" style="color:var(--rust)">${evt.v ?? 'Error'}</p>`;
                copy[copy.length - 1] = last;
                return copy;
              });
            }
          } catch { /* ignore malformed lines */ }
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Handle person-link clicks via event delegation
  function handleMessageClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest('[data-id]');
    if (target) {
      const id = target.getAttribute('data-id');
      if (id) {
        onNavigateTo(id);
        setOpen(false);
      }
    }
  }

  return (
    <>
      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat' : 'Open AI chat'}
        style={{
          position:     'fixed',
          bottom:       '1.75rem',
          right:        '1.75rem',
          zIndex:       950,
          width:        48,
          height:       48,
          borderRadius: '50%',
          background:   '#8b5e3c',
          border:       'none',
          color:        'white',
          fontSize:     '1.2rem',
          cursor:       'pointer',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          boxShadow:    '0 2px 12px rgba(0,0,0,0.2)',
          transition:   'transform 0.15s',
        }}
      >
        {open ? '×' : '✦'}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          style={{
            position:    'fixed',
            right:       0,
            top:         0,
            bottom:      0,
            width:       'min(420px, 100vw)',
            zIndex:      940,
            display:     'flex',
            flexDirection: 'column',
            background:  '#f7f4f0',
            borderLeft:  '1px solid #e8e0d8',
            boxShadow:   '-4px 0 24px rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              background:   'white',
              borderBottom: '1px solid #e8e0d8',
              padding:      '14px 20px',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.6rem',
            }}
          >
            <span style={{ color: '#8b5e3c', fontSize: '1rem' }}>✦</span>
            <span
              style={{
                color:       '#2c1810',
                fontSize:    '14px',
                fontWeight:  600,
                flex:        1,
              }}
            >
              Family Historian
            </span>
            <button
              onClick={() => setMessages([])}
              title="Clear conversation"
              style={{
                background:  'none',
                border:      'none',
                color:       '#9a8a7a',
                fontSize:    '12px',
                cursor:      'pointer',
                padding:     '4px 8px',
              }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex:      1,
              overflowY: 'auto',
              padding:   '1.25rem 1rem',
              display:   'flex',
              flexDirection: 'column',
              gap:       '0.75rem',
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#7a6a5a', fontSize: '13px', textAlign: 'center', marginTop: '2rem', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '0.5rem' }}>Ask anything about your family tree.</p>
                <p style={{ fontSize: '12px', color: '#9a8a7a' }}>
                  Try: &ldquo;Who is the oldest person?&rdquo; or{' '}
                  &ldquo;Show me the paternal line&rdquo;
                  {currentPersonId ? ' from the current person' : ''}.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display:  'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: '0.25rem',
                }}
              >
                {/* Status lines */}
                {msg.statuses.map((s, j) => (
                  <p
                    key={j}
                    style={{
                      fontSize:   '12px',
                      color:      '#9a8a7a',
                      fontStyle:  'italic',
                      margin:     0,
                      paddingLeft: '0.25rem',
                    }}
                  >
                    {s}
                  </p>
                ))}

                {/* Message bubble */}
                {msg.role === 'user' ? (
                  <div
                    style={{
                      background:   '#8b5e3c',
                      color:        'white',
                      borderRadius: '12px 12px 2px 12px',
                      padding:      '10px 14px',
                      maxWidth:     '85%',
                      fontSize:     '13px',
                      lineHeight:   1.5,
                    }}
                  >
                    {msg.content}
                  </div>
                ) : msg.content ? (
                  <div
                    style={{
                      background:   'white',
                      border:       '1px solid #e8e0d8',
                      borderRadius: '2px 12px 12px 12px',
                      padding:      '12px 14px',
                      maxWidth:     '95%',
                      fontSize:     '13px',
                      lineHeight:   1.6,
                    }}
                    onClick={handleMessageClick}
                    dangerouslySetInnerHTML={{ __html: msg.content }}
                  />
                ) : (
                  <div
                    style={{
                      background:   'white',
                      border:       '1px solid #e8e0d8',
                      borderRadius: '2px 12px 12px 12px',
                      padding:      '12px 14px',
                      maxWidth:     '95%',
                      fontSize:     '13px',
                    }}
                  >
                    {streaming && (
                      <span style={{ color: '#9a8a7a', fontStyle: 'italic' }}>…</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              borderTop:  '1px solid #e8e0d8',
              padding:    '12px',
              display:    'flex',
              gap:        '8px',
              background: 'white',
            }}
          >
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your family tree…"
              disabled={streaming}
              style={{
                flex:       1,
                resize:     'none',
                border:     '1px solid #e8e0d8',
                borderRadius: 8,
                padding:    '10px 12px',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                fontSize:   '13px',
                background: streaming ? '#f7f4f0' : 'white',
                color:      '#2c1810',
                outline:    'none',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              style={{
                alignSelf:    'flex-end',
                background:   streaming || !input.trim() ? '#f0ebe3' : '#8b5e3c',
                border:       'none',
                borderRadius: 7,
                color:        streaming || !input.trim() ? '#9a8a7a' : 'white',
                fontSize:     '13px',
                fontWeight:   500,
                padding:      '9px 16px',
                cursor:       streaming || !input.trim() ? 'default' : 'pointer',
                whiteSpace:   'nowrap',
                transition:   'background 0.15s',
              }}
            >
              {streaming ? '…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
