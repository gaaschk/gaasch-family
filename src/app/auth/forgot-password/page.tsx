import React, { useState } from 'react';
import { sendForgotPassword } from '@/lib/auth/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await sendForgotPassword({ email });
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send reset link');
    }
  };
  if (sent) {
    return <p>Please check your email for the reset link.</p>;
  }
  return (
    <form onSubmit={onSubmit}>
      <h1>Forgot password</h1>
      {error && <div role="alert">{error}</div>}
      <label>
        Email
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
      </label>
      <button type="submit">Send reset link</button>
    </form>
  );
}
