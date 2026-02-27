import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();

  // Authenticated users go to their home page
  if (session?.user?.id) {
    redirect('/home');
  }

  return (
    <>
      <nav className="pub-nav">
        <span className="pub-nav-title">Family History</span>
        <Link href="/login" className="pub-nav-admin">Sign in</Link>
      </nav>

      <div className="pub-page">
        {/* ── Hero ── */}
        <section className="hero-section">
          <div className="hero-ornament">✦ ✦ ✦</div>
          <h1>Family History</h1>
          <p className="hero-subtitle">Private genealogy for families</p>
          <div className="hero-rule" />
          <p className="hero-body">
            A private platform for preserving and exploring family history — searchable people directories,
            interactive family trees, and narrative biographies powered by AI.
          </p>
          <p className="hero-body" style={{ marginTop: '0.75rem', opacity: 0.7, fontSize: '0.95em' }}>
            Available to family members and invited guests.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
            <Link href="/login" className="hero-cta">Sign in</Link>
            <Link
              href="/signup"
              className="hero-cta"
              style={{
                background: 'transparent',
                borderColor: 'rgba(196,150,42,0.35)',
                color: 'var(--parchment-deep)',
              }}
            >
              Request access
            </Link>
          </div>
        </section>

        {/* ── Features ── */}
        <section style={{ padding: '4rem 1.5rem 5rem' }}>
          <div className="section-wrap fade-in">
            <div className="chapter-header">
              <span className="chapter-num">Features</span>
              <h2>What You&rsquo;ll Find Inside</h2>
              <p className="chapter-meta">A private archive — sign in to explore</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2.5rem',
              marginTop: '3rem',
            }}>
              {([
                {
                  num: 'I',
                  title: 'Family Trees',
                  body: 'Browse your family tree interactively. Click through generations, view relationships, and explore biographical narratives for each person.',
                },
                {
                  num: 'II',
                  title: 'People Directory',
                  body: 'Search every person in the tree by name, place, or date. Export your data in standard GEDCOM format compatible with any genealogy application.',
                },
                {
                  num: 'III',
                  title: 'AI Narratives',
                  body: 'Generate richly written biographical narratives for ancestors using Claude AI — grounding each person in their historical context.',
                },
              ] as const).map(({ num, title, body }) => (
                <div key={num} style={{ borderTop: '1px solid rgba(196,150,42,0.3)', paddingTop: '1.5rem' }}>
                  <span className="chapter-num" style={{ fontSize: '0.65rem', marginBottom: '0.5rem', display: 'block' }}>
                    {num}
                  </span>
                  <p className="section-title" style={{ marginBottom: '0.6rem' }}>{title}</p>
                  <p className="body-text" style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.7 }}>{body}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
              <Link href="/login" className="hero-cta" style={{ display: 'inline-block' }}>
                Sign in to explore ›
              </Link>
              <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--sepia)', fontStyle: 'italic' }}>
                Don&rsquo;t have an account?{' '}
                <Link href="/signup" style={{ color: 'var(--rust)' }}>Request access</Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="pub-footer">
          <span className="pub-footer-ornament">✦ ✦ ✦</span>
          Family History — Private genealogy platform
        </footer>
      </div>
    </>
  );
}
