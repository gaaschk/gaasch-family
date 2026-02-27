import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';

async function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/login' });
      }}
    >
      <button type="submit" className="admin-signout-btn">
        Sign out
      </button>
    </form>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = session.user.id;

  const [ownedTrees, memberRows] = await Promise.all([
    prisma.tree.findMany({
      where: { ownerId: userId },
      include: {
        _count: { select: { members: true, people: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.treeMember.findMany({
      where: { userId },
      include: {
        tree: {
          include: {
            _count: { select: { members: true, people: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    }),
  ]);

  const ownedIds = new Set(ownedTrees.map(t => t.id));
  const nonOwnedMemberRows = memberRows.filter(row => !ownedIds.has(row.tree.id));

  const hasAnything = ownedTrees.length > 0 || nonOwnedMemberRows.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--parchment)' }}>
      {/* Top navigation bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-light)',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--parchment)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            color: 'var(--ink)',
          }}
        >
          Family Trees
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/home"
            style={{
              fontSize: '0.82rem',
              color: 'var(--sepia)',
              fontFamily: 'var(--font-sc)',
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            Home
          </Link>
          <span
            style={{
              fontSize: '0.82rem',
              color: 'var(--sepia)',
              fontFamily: 'var(--font-sc)',
            }}
          >
            {session.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '2rem',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            Your Trees
          </h1>
          <Link href="/trees/new" className="btn btn-primary">
            + Create new tree
          </Link>
        </div>

        {session.user.role === 'admin' && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-sc)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                color: 'var(--sepia)',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              System Admin
            </h2>
            <Link
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                padding: '0.9rem 1.25rem',
                background: '#fff',
                color: 'var(--ink)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-sc)',
                letterSpacing: '0.04em',
              }}
            >
              Platform Management &rarr;
            </Link>
          </section>
        )}

        {!hasAnything && (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              border: '1px dashed var(--border)',
              borderRadius: 8,
              color: 'var(--sepia)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                marginBottom: '0.75rem',
              }}
            >
              No trees yet
            </p>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Create your first family tree to start adding people and families.
            </p>
            <Link href="/trees/new" className="btn btn-primary">
              Create a tree
            </Link>
          </div>
        )}

        {ownedTrees.length > 0 && (
          <section style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontFamily: 'var(--font-sc)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                color: 'var(--sepia)',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              Owned by you
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              {ownedTrees.map(tree => (
                <TreeCard
                  key={tree.id}
                  slug={tree.slug}
                  name={tree.name}
                  description={tree.description}
                  memberCount={tree._count.members}
                  personCount={tree._count.people}
                  badge="owner"
                />
              ))}
            </div>
          </section>
        )}

        {nonOwnedMemberRows.length > 0 && (
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-sc)',
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                color: 'var(--sepia)',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              Member of
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1rem',
              }}
            >
              {nonOwnedMemberRows.map(row => (
                <TreeCard
                  key={row.tree.id}
                  slug={row.tree.slug}
                  name={row.tree.name}
                  description={row.tree.description}
                  memberCount={row.tree._count.members}
                  personCount={row.tree._count.people}
                  badge={row.role}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function TreeCard({
  slug,
  name,
  description,
  memberCount,
  personCount,
  badge,
}: {
  slug: string;
  name: string;
  description: string | null;
  memberCount: number;
  personCount: number;
  badge: string;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--border-light)',
        borderRadius: 8,
        padding: '1.25rem',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.05rem',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          {name}
        </h3>
        <span
          className={`admin-role-badge ${badge}`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {badge}
        </span>
      </div>

      {description && (
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--sepia)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--sepia)',
          fontFamily: 'var(--font-sc)',
        }}
      >
        <span>{personCount.toLocaleString()} people</span>
        <span>{memberCount.toLocaleString()} members</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <Link
          href={`/trees/${slug}/`}
          className="btn btn-primary btn-sm"
          style={{ flex: badge === 'viewer' ? undefined : 1, textAlign: 'center' }}
        >
          View tree
        </Link>
        {badge !== 'viewer' && (
          <Link
            href={`/trees/${slug}/admin`}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, textAlign: 'center' }}
          >
            Admin
          </Link>
        )}
      </div>
    </div>
  );
}
