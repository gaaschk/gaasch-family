'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const searchParams = useSearchParams();
  const verified     = searchParams.get('verified') === '1';
  const callbackUrl  = searchParams.get('callbackUrl') || '/';
  const oauthError   = searchParams.get('error');

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

        {oauthError === 'OAuthAccountNotLinked' && (
          <p className="login-error" style={{ marginBottom: '1rem' }}>
            This email is already registered with a password. Sign in with your password instead.
          </p>
        )}

        {/* Google sign-in */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl })}
          style={{
            width:          '100%',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '0.6rem',
            padding:        '0.65rem 1rem',
            border:         '1px solid var(--border)',
            borderRadius:   6,
            background:     '#fff',
            color:          '#3c4043',
            fontSize:       '0.875rem',
            fontFamily:     'var(--font-body)',
            cursor:         'pointer',
            marginBottom:   '1rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--sepia)', whiteSpace: 'nowrap' }}>or sign in with email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>

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
