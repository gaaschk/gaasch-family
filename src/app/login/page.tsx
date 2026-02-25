'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('sent');
      setMessage(`Check ${email} for a sign-in link.`);
    }
  }

  return (
    <main style={{ padding: '4rem 2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Sign In</h1>
      <p>Enter your email address. We will send you a magic link.</p>

      {status === 'sent' ? (
        <p style={{ color: 'green' }}>{message}</p>
      ) : (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          {status === 'error' && <p style={{ color: 'red' }}>{message}</p>}
          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </main>
  );
}
