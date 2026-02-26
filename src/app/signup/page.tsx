'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.status === 409) {
        setStatus('error');
        setMessage(data.error ?? 'Account already exists.');
      } else if (res.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="hero-ornament" style={{ fontSize: '1rem', marginBottom: '1rem' }}>✦ ✦ ✦</div>
        <h1 className="login-title">The Gaasch Family</h1>
        <p className="login-subtitle">Request Access</p>

        {status === 'sent' ? (
          <div className="login-success">
            <p>Check <strong>{email}</strong> for a verification link.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.8 }}>
              Click the link to create your password. After that, an admin will
              approve your access level before you can sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <p className="login-hint">
              Enter your email address to get started. You&apos;ll receive a link
              to create your password.
            </p>
            <label className="sr-only" htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              className="login-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            {status === 'error' && <p className="login-error">{message}</p>}
            <button type="submit" className="login-btn" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending…' : 'Send verification link'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--sepia)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--rust)' }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
