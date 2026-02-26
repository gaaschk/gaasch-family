'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
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
        <p className="login-subtitle">Reset Password</p>

        {status === 'sent' ? (
          <div className="login-success">
            <p>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.8 }}>
              The link expires in 1 hour. Check your spam folder if it doesn&apos;t arrive.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <p className="login-hint">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
            <label className="sr-only" htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
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
              {status === 'loading' ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--sepia)' }}>
          <Link href="/login" style={{ color: 'var(--rust)' }}>Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
