'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  token: string;
  email: string;
}

export default function SetPasswordForm({ token, email }: Props) {
  const router = useRouter();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [status, setStatus]       = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError]         = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/auth/set-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, email, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) {
        router.push('/login?verified=1');
      } else {
        setStatus('error');
        setError(data.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setError('Something went wrong. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <p className="login-hint">
        Creating password for <strong>{email}</strong>
      </p>

      <label className="sr-only" htmlFor="set-password">Password</label>
      <input
        id="set-password"
        type="password"
        className="login-input"
        placeholder="Password (min. 8 characters)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoFocus
        minLength={8}
      />

      <label className="sr-only" htmlFor="set-password-confirm">Confirm password</label>
      <input
        id="set-password-confirm"
        type="password"
        className="login-input"
        placeholder="Confirm password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        required
        style={{ marginTop: '0.5rem' }}
      />

      {(status === 'error' || error) && (
        <p className="login-error">{error}</p>
      )}

      <button type="submit" className="login-btn" disabled={status === 'loading'}>
        {status === 'loading' ? 'Saving…' : 'Create password'}
      </button>
    </form>
  );
}
