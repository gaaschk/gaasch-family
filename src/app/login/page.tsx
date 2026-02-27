'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const searchParams = useSearchParams();
  const verified     = searchParams.get('verified') === '1';
  const callbackUrl  = searchParams.get('callbackUrl') || '/';

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (!result?.error) {
      // Hard navigation avoids Next.js router getting stuck if middleware
      // redirects back to this same page before the admin page fully loads.
      window.location.href = callbackUrl;
    } else {
      setStatus('error');
      setError('Invalid email or password.');
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="hero-ornament" style={{ fontSize: '1rem', marginBottom: '1rem' }}>✦ ✦ ✦</div>
        <h1 className="login-title">Family History</h1>
        <p className="login-subtitle">Sign in to your account</p>

        {verified && (
          <div className="login-success" style={{ marginBottom: '1rem' }}>
            <p>Account created! You can now sign in.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <label className="sr-only" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            className="login-input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <label className="sr-only" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ marginTop: '0.5rem' }}
          />
          {status === 'error' && <p className="login-error">{error}</p>}
          <button type="submit" className="login-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--sepia)' }}>
          <Link href="/forgot-password" style={{ color: 'var(--rust)' }}>Forgot password?</Link>
          {' · '}
          New here?{' '}
          <Link
            href={callbackUrl !== '/' ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/signup'}
            style={{ color: 'var(--rust)' }}
          >
            Request access
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
