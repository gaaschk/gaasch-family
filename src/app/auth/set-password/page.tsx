import React, { useState } from 'react';
import { setPassword } from '@/lib/auth/api';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      await setPassword({ password });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to set password');
    }
  };
  if (success) return <p>Password updated. You can now log in.</p>;
  return (
    <form onSubmit={onSubmit}>
      <h1>Set password</h1>
      {error && <div role="alert">{error}</div>}
      <label>
        New Password
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
      </label>
      <label>
        Confirm Password
        <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" required />
      </label>
      <button type="submit">Set password</button>
    </form>
  );
}
