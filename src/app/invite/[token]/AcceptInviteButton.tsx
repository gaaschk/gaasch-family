'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AcceptInviteButtonProps {
  token: string;
  treeSlug: string;
}

export default function AcceptInviteButton({ token, treeSlug }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'accepting' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleAccept() {
    setStatus('accepting');
    setError('');

    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `${res.status} ${res.statusText}`);
        setStatus('error');
        return;
      }
      router.push(`/trees/${treeSlug}/`);
    } catch {
      setError('Network error — please try again');
      setStatus('error');
    }
  }

  return (
    <>
      <button
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={handleAccept}
        disabled={status === 'accepting'}
      >
        {status === 'accepting' ? 'Accepting\u2026' : 'Accept invite'}
      </button>
      {status === 'error' && (
        <p
          style={{
            color: 'var(--rust)',
            fontSize: '0.85rem',
            marginTop: '0.75rem',
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}
