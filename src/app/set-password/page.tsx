import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SetPasswordForm from './SetPasswordForm';

interface Props {
  searchParams: Promise<{ token?: string; email?: string; reset?: string; callbackUrl?: string }>;
}

export default async function SetPasswordPage({ searchParams }: Props) {
  const { token, email, reset, callbackUrl } = await searchParams;
  const isReset = reset === '1';

  if (!token || !email) {
    return <InvalidLink isReset={isReset} />;
  }

  // Basic validity check — full validation happens on form submit
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: decodeURIComponent(email), token } },
  });

  if (!record || record.expires < new Date()) {
    return <InvalidLink expired={!!record} isReset={isReset} />;
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="hero-ornament" style={{ fontSize: '1rem', marginBottom: '1rem' }}>✦ ✦ ✦</div>
        <h1 className="login-title">Family History</h1>
        <p className="login-subtitle">{isReset ? 'Reset Your Password' : 'Create Your Password'}</p>
        <SetPasswordForm token={token} email={decodeURIComponent(email)} callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}

function InvalidLink({ expired, isReset }: { expired?: boolean; isReset?: boolean }) {
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="hero-ornament" style={{ fontSize: '1rem', marginBottom: '1rem' }}>✦ ✦ ✦</div>
        <h1 className="login-title">Family History</h1>
        <p className="login-subtitle">Link {expired ? 'Expired' : 'Invalid'}</p>
        <div className="login-success" style={{ marginTop: '1.5rem' }}>
          <p>
            {expired
              ? 'This verification link has expired.'
              : 'This verification link is invalid or has already been used.'}
          </p>
        </div>
        <Link
          href={isReset ? '/forgot-password' : '/signup'}
          className="login-btn"
          style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem', textDecoration: 'none' }}
        >
          {isReset ? 'Request a new reset link' : 'Request a new link'}
        </Link>
      </div>
    </main>
  );
}
