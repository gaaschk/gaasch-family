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
      window.location.href = callbackUrl;
    } else {
      setStatus('error');
      setError('Invalid email or password.');
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0ebe3',
      padding: '2rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'white',
        borderRadius: 16,
        border: '1px solid #e8e0d8',
        padding: '40px 36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <Link
          href="/"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#2c1810',
            letterSpacing: -0.5,
            marginBottom: 28,
            display: 'block',
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          heir<span style={{ color: '#8b5e3c' }}>loom</span>
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: '#7a6a5a', textAlign: 'center', marginBottom: 28 }}>
          Sign in to your Heirloom account
        </p>

        {verified && (
          <div className="login-success" style={{ marginBottom: 16 }}>
            <p>Account created! You can now sign in.</p>
          </div>
        )}

        {oauthError === 'OAuthAccountNotLinked' && (
          <p className="login-error" style={{ marginBottom: 16 }}>
            This email is already registered with a password. Sign in with your password instead.
          </p>
        )}

        {/* Social buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl })}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 8,
              border: '1px solid #e8e0d8',
              background: '#f7f4f0',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: '#2c1810',
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
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: '#e8e0d8' }} />
          <span style={{ fontSize: 12, color: '#9a8a7a' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#e8e0d8' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2c1810', marginBottom: 5 }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e8e0d8',
                fontSize: 14,
                background: 'white',
                color: '#2c1810',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2c1810', marginBottom: 5 }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #e8e0d8',
                fontSize: 14,
                background: 'white',
                color: '#2c1810',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <Link href="/forgot-password" style={{ fontSize: 13, color: '#8b5e3c', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          {status === 'error' && <p className="login-error">{error}</p>}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              background: '#8b5e3c',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              marginTop: 8,
              opacity: status === 'loading' ? 0.6 : 1,
            }}
          >
            {status === 'loading' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: '#7a6a5a', marginTop: 24, textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link
            href={callbackUrl !== '/' ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/signup'}
            style={{ color: '#8b5e3c', fontWeight: 500, textDecoration: 'none' }}
          >
            Sign up free
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
