import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, callbackUrl: '/' });
      if (res && (res as any).error) {
        setError((res as any).error as string);
      } else {
        // If provider sign-in uses redirects, this will handle navigation
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <h1>Login</h1>
      {error && <div role="alert">{error}</div>}
      <label>
        Email
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
      </label>
      <label>
        Password
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
      <div>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </form>
  );
}
