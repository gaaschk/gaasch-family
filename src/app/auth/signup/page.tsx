import React, { useState } from 'react';
import { signUp } from '@/lib/auth/api';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const ok = await signUp({ email, password });
      if (!ok) throw new Error('Signup failed');
      window.location.href = '/login';
    } catch (err: any) {
      setError(err?.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <h1>Sign up</h1>
      {error && <div role="alert">{error}</div>}
      <label>
        Email
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
      </label>
      <label>
        Password
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
      </label>
      <label>
        Confirm Password
        <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" required />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Signing up...' : 'Sign up'}</button>
      <div>
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </form>
  );
}
