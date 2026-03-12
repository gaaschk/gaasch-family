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
      <button
        type="submit"
        style={{
          padding: '6px 14px',
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 500,
          background: 'white',
          border: '1px solid #e8e0d8',
          color: '#7a6a5a',
          cursor: 'pointer',
        }}
      >
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
    <div style={{ minHeight: '100vh', background: '#f7f4f0' }}>
      {/* Top navigation bar */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e8e0d8',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#2c1810', letterSpacing: -0.5 }}>
          heir<span style={{ color: '#8b5e3c' }}>loom</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/home" style={{ fontSize: 14, color: '#7a6a5a', textDecoration: 'none' }}>
            Home
          </Link>
          <span style={{ fontSize: 13, color: '#9a8a7a' }}>
            {session.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2c1810', margin: 0 }}>
            Your Trees
          </h1>
          <Link href="/trees/new" className="btn btn-primary">
            + Create new tree
          </Link>
        </div>

        {session.user.role === 'admin' && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#9a8a7a',
              marginBottom: 12,
            }}>
              System Admin
            </h2>
            <Link
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid #e8e0d8',
                borderRadius: 10,
                padding: '14px 20px',
                background: 'white',
                color: '#2c1810',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Platform Management &rarr;
            </Link>
          </section>
        )}

        {!hasAnything && (
          <div style={{
            textAlign: 'center',
            padding: '64px 32px 48px',
            borderRadius: 12,
            background: 'white',
            border: '1px solid #e8e0d8',
            maxWidth: 620,
            margin: '0 auto',
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2c1810', margin: '0 0 8px' }}>
              Start your family journey
            </h2>
            <p style={{
              fontSize: 15,
              color: '#7a6a5a',
              lineHeight: 1.6,
              maxWidth: 440,
              margin: '0 auto 32px',
            }}>
              Build your family tree, uncover your heritage, and discover if you
              qualify for EU citizenship through your ancestors.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
              textAlign: 'center',
              marginBottom: 32,
            }}>
              {[
                { step: '1', title: 'Build your tree', desc: 'Add ancestors and map your lineage back through generations' },
                { step: '2', title: 'Check eligibility', desc: 'See if your heritage qualifies you for EU citizenship' },
                { step: '3', title: 'Track progress', desc: 'Manage documents and follow your application status' },
              ].map(item => (
                <div key={item.step}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#fdf6ef',
                    border: '1px solid #e8d8c8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#8b5e3c',
                    marginBottom: 8,
                  }}>
                    {item.step}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2c1810', margin: '0 0 4px' }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 13, color: '#7a6a5a', margin: 0, lineHeight: 1.45 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <Link href="/trees/new" className="btn btn-primary">
              Create your first tree
            </Link>
          </div>
        )}

        {ownedTrees.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#9a8a7a',
              marginBottom: 12,
            }}>
              Owned by you
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}>
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
            <h2 style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#9a8a7a',
              marginBottom: 12,
            }}>
              Member of
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}>
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
    <div style={{
      border: '1px solid #e8e0d8',
      borderRadius: 10,
      padding: 20,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2c1810', margin: 0 }}>
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
        <p style={{ fontSize: 14, color: '#7a6a5a', margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      )}

      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#9a8a7a' }}>
        <span>{personCount.toLocaleString()} people</span>
        <span>{memberCount.toLocaleString()} members</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
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
