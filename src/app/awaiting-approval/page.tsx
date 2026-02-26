import { signOut } from '@/auth';

async function SignOutButton() {
  return (
    <form action={async () => {
      'use server';
      await signOut({ redirectTo: '/login' });
    }}>
      <button type="submit" className="login-btn" style={{ marginTop: '0.75rem', width: '100%' }}>
        Sign out
      </button>
    </form>
  );
}

export default function AwaitingApprovalPage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="hero-ornament" style={{ fontSize: '1rem', marginBottom: '1rem' }}>✦ ✦ ✦</div>
        <h1 className="login-title">Account Pending</h1>
        <p className="login-subtitle">Awaiting Admin Approval</p>
        <div className="login-success" style={{ marginTop: '1.5rem' }}>
          <p>
            Your email has been verified. An admin will review your account
            and assign you an access role shortly.
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.75rem', opacity: 0.8 }}>
            Once approved, sign in again to access the site.
          </p>
        </div>
        <SignOutButton />
      </div>
    </main>
  );
}
