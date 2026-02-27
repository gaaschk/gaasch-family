import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AcceptInviteButton from './AcceptInviteButton';

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/invite/${token}`);

  const invite = await prisma.treeInvite.findUnique({
    where: { token },
    include: { tree: { select: { name: true, slug: true } } },
  });

  // Helper: centered card layout
  function Card({ children }: { children: React.ReactNode }) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--parchment)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: '100%',
            background: '#fff',
            border: '1px solid var(--border-light)',
            borderRadius: 10,
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <Card>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            color: 'var(--ink)',
            marginBottom: '0.75rem',
          }}
        >
          Invalid invite link
        </h1>
        <p style={{ color: 'var(--sepia)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          This invite link does not exist or has already been used.
        </p>
        <a href="/dashboard" className="btn btn-primary">
          Go to dashboard
        </a>
      </Card>
    );
  }

  const now = new Date();

  if (invite.acceptedAt) {
    return (
      <Card>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            color: 'var(--ink)',
            marginBottom: '0.75rem',
          }}
        >
          Already accepted
        </h1>
        <p style={{ color: 'var(--sepia)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          This invite was already accepted on{' '}
          {new Date(invite.acceptedAt).toLocaleDateString()}.
        </p>
        <a href={`/trees/${invite.tree.slug}/`} className="btn btn-primary">
          Open {invite.tree.name}
        </a>
      </Card>
    );
  }

  if (invite.expiresAt < now) {
    return (
      <Card>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            color: 'var(--ink)',
            marginBottom: '0.75rem',
          }}
        >
          Invite expired
        </h1>
        <p style={{ color: 'var(--sepia)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          This invite expired on {new Date(invite.expiresAt).toLocaleDateString()}.
          Please ask the tree owner to send a new invite.
        </p>
        <a href="/dashboard" className="btn btn-secondary">
          Go to dashboard
        </a>
      </Card>
    );
  }

  // Valid invite — show accept UI
  return (
    <Card>
      <p
        style={{
          fontFamily: 'var(--font-sc)',
          fontSize: '0.78rem',
          letterSpacing: '0.08em',
          color: 'var(--sepia)',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
        }}
      >
        You have been invited
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          color: 'var(--ink)',
          marginBottom: '0.5rem',
        }}
      >
        {invite.tree.name}
      </h1>
      <p style={{ color: 'var(--sepia)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
        You have been invited as a{' '}
        <strong>{invite.role}</strong>.
      </p>
      <p
        style={{
          color: 'var(--sepia)',
          fontSize: '0.8rem',
          marginBottom: '2rem',
        }}
      >
        Expires {new Date(invite.expiresAt).toLocaleDateString()}
      </p>

      <AcceptInviteButton token={token} treeSlug={invite.tree.slug} />

      <p
        style={{
          marginTop: '1rem',
          fontSize: '0.8rem',
          color: 'var(--sepia)',
        }}
      >
        Signed in as {session.user.email}
      </p>
    </Card>
  );
}
