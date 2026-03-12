'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function SignupForm() {
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get('callbackUrl') || '';

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
        body:    JSON.stringify({ email, callbackUrl }),
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

  const signInHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : '/login';

  return (
    <main style={{ minHeight: '100vh', display: 'flex', background: '#f0ebe3' }}>
      {/* Left: form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <Link
            href="/"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#2c1810',
              letterSpacing: -0.5,
              marginBottom: 32,
              display: 'block',
              textDecoration: 'none',
            }}
          >
            heir<span style={{ color: '#8b5e3c' }}>loom</span>
          </Link>

          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 14, color: '#7a6a5a', marginBottom: 28 }}>
            Start building your family tree and discover your citizenship eligibility.
          </p>

          {status === 'sent' ? (
            <div className="login-success">
              <p>Check <strong>{email}</strong> for a verification link.</p>
              <p style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>
                Click the link to set your password and sign in.
              </p>
            </div>
          ) : (
            <>
              {/* Social buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: callbackUrl || '/' })}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: 8,
                    border: '1px solid #e8e0d8',
                    background: 'white',
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
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: '#e8e0d8' }} />
                <span style={{ fontSize: 12, color: '#9a8a7a' }}>or sign up with email</span>
                <div style={{ flex: 1, height: 1, background: '#e8e0d8' }} />
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="signup-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#2c1810', marginBottom: 5 }}>
                    Email
                  </label>
                  <input
                    id="signup-email"
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

                {status === 'error' && <p className="login-error">{message}</p>}

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
                  {status === 'loading' ? 'Sending...' : 'Create account'}
                </button>
              </form>

              <p style={{ fontSize: 12, color: '#9a8a7a', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
                By signing up you agree to our{' '}
                <Link href="/tos" style={{ color: '#8b5e3c', textDecoration: 'none' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" style={{ color: '#8b5e3c', textDecoration: 'none' }}>Privacy Policy</Link>.
              </p>
            </>
          )}

          <p style={{ fontSize: 13, color: '#7a6a5a', marginTop: 20, textAlign: 'center' }}>
            Already have an account?{' '}
            <Link href={signInHref} style={{ color: '#8b5e3c', fontWeight: 500, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right: promo panel */}
      <div style={{
        width: 480,
        background: 'linear-gradient(135deg, #2c1810 0%, #5c3420 50%, #8b5e3c 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🏰</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Your European heritage awaits
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Millions of Americans are eligible for EU citizenship through ancestry.
            Build your tree and we&apos;ll show you the path.
          </p>
          <div style={{ fontSize: 24, letterSpacing: 6, marginTop: 24 }}>
            🇱🇺 🇩🇪 🇮🇪 🇮🇹 🇵🇱 🇭🇺
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
