import Link from 'next/link';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import AccountMenu from '@/components/AccountMenu';
import {
  PublicTreeExplorer,
  PublicMapsSection,
  PublicDirectorySection,
} from '@/components/public/ClientSections';
import { CHAPTER_CHAIN } from '@/components/public/chapters';
import 'leaflet/dist/leaflet.css';

async function getHeroStats() {
  const [peopleCount, familyCount, birthDates] = await Promise.all([
    prisma.person.count(),
    prisma.family.count(),
    prisma.person.findMany({
      where: { birthDate: { not: null } },
      select: { birthDate: true },
    }),
  ]);

  const years = birthDates
    .map(p => p.birthDate!.match(/\b(\d{4})\b/)?.[1])
    .filter((y): y is string => y !== undefined)
    .map(Number)
    .filter(y => y > 1400 && y < 2100);

  const minYear = years.length > 0 ? Math.min(...years) : 1698;
  const yearsOfHistory = new Date().getFullYear() - minYear;

  return { peopleCount, familyCount, yearsOfHistory };
}

// ── Landing page for unauthenticated visitors ────────────────────────────────

function LandingPage() {
  return (
    <>
      <nav className="pub-nav">
        <span className="pub-nav-title">The Gaasch Family</span>
        <Link href="/login" className="pub-nav-admin">Sign in</Link>
      </nav>

      <div className="pub-page">
        {/* ── Hero ── */}
        <section className="hero-section">
          <div className="hero-ornament">✦ ✦ ✦</div>
          <h1>The Gaasch Family</h1>
          <p className="hero-subtitle">A History Across Ten Generations</p>
          <div className="hero-rule" />
          <p className="hero-body">
            A private family history spanning four centuries and two continents —
            from the villages of Luxembourg through the French Revolutionary era,
            across the Atlantic to the American Midwest, and west to the Texas High Plains.
          </p>
          <p className="hero-body" style={{ marginTop: '0.75rem', opacity: 0.7, fontSize: '0.95em' }}>
            Available to family members and invited guests.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }}>
            <Link href="/login" className="hero-cta">
              Sign in
            </Link>
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

          <p className="hero-dates">
            17th Century — Present Day &nbsp;·&nbsp; Luxembourg &amp; America
          </p>
        </section>

        {/* ── What's inside ── */}
        <section style={{ padding: '4rem 1.5rem 5rem' }}>
          <div className="section-wrap fade-in">
            <div className="chapter-header">
              <span className="chapter-num">Overview</span>
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
                  title: 'Ten Generations',
                  body: 'The direct paternal line traced from the Alzette valley through the French Revolutionary era, across the Atlantic, and across the American frontier — documented through primary source parish and land records.',
                },
                {
                  num: 'II',
                  title: 'Family Records',
                  body: 'A searchable archive of family members across all branches, with birth, marriage, and death records drawn from Luxembourg parish registers, Iowa land records, and American census documentation.',
                },
                {
                  num: 'III',
                  title: 'Historical Research',
                  body: 'Interactive migration maps, transcriptions from eighteenth-century Luxembourg parish registers, and ongoing archival research tracing the family into the generation before 1698.',
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
          The Gaasch Family — A History Across Ten Generations<br />
          Alzingen, Luxembourg · 17th Century — Bailey County, Texas · Present
        </footer>
      </div>
    </>
  );
}

// ── Full site for authenticated visitors ─────────────────────────────────────

export default async function HomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <LandingPage />;
  }

  const { peopleCount, familyCount, yearsOfHistory } = await getHeroStats();

  return (
    <>
      {/* ── Navigation ── */}
      <nav className="pub-nav">
        <a href="#hero" className="pub-nav-title">The Gaasch Family</a>
        <ul className="pub-nav-links">
          <li><a href="#hero">Home</a></li>
          <li><a href="#chapters">Chapters</a></li>
          <li><a href="#maps">Maps</a></li>
          <li><a href="#directory">All People</a></li>
          <li><a href="#appendix">Archive</a></li>
        </ul>
        <AccountMenu
          email={session.user.email ?? ''}
          name={session.user.name}
          role={session.user.role ?? 'viewer'}
        />
      </nav>

      <div className="pub-page">
        {/* ── Hero ── */}
        <section id="hero" className="hero-section">
          <div className="hero-ornament">✦ ✦ ✦</div>
          <h1>The Gaasch Family</h1>
          <p className="hero-subtitle">A History Across Ten Generations</p>
          <div className="hero-rule" />
          <p className="hero-body">
            From the Villages of Luxembourg to the American Frontier — tracing the direct paternal line
            from the Alzette valley village of Alzingen through ten generations to the Texas High Plains.
            Beginning in 17th-century Luxembourg, the line passes through the French Revolutionary era,
            crosses the Atlantic in 1848, homesteads the Kansas prairie, rides the Tulsa oil boom,
            and arrives at the present day in Bailey County, Texas.
          </p>

          {peopleCount > 0 && (
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">{peopleCount.toLocaleString()}</span>
                <span className="hero-stat-label">People</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">{familyCount.toLocaleString()}</span>
                <span className="hero-stat-label">Families</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">{CHAPTER_CHAIN.length}</span>
                <span className="hero-stat-label">Generations</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-num">{yearsOfHistory}</span>
                <span className="hero-stat-label">Years of history</span>
              </div>
            </div>
          )}

          <a href="#chapters" className="hero-cta">Begin Exploring ↓</a>
          <p className="hero-dates">17th Century — Present Day &nbsp;·&nbsp; Luxembourg &amp; America</p>
        </section>

        {/* ── Chapters + Tree Explorer ── */}
        <PublicTreeExplorer />

        {/* ── Maps ── */}
        <PublicMapsSection />

        {/* ── People Directory ── */}
        <PublicDirectorySection />

        {/* ── Appendix ── */}
        <section id="appendix" className="appendix-section">
          <div className="section-wrap fade-in">
            <div className="chapter-header">
              <span className="chapter-num">Appendix</span>
              <h2>Beyond Jean Gaasch</h2>
              <p className="chapter-meta">The Archive Trail — Research into the Generation Before 1698</p>
            </div>
            <p className="body-text">
              Jean Gaasch, born circa 1698, is the earliest ancestor in the current family tree.
              But the written record almost certainly extends further back. Two significant research sessions
              examining primary source parish registers have produced substantial new discoveries.
            </p>
            <p className="section-title">What the Hesperange Register Has Confirmed</p>
            <p className="body-text">
              Jean appears in multiple entries between 1719 and 1724 as &lsquo;Jois&rsquo; (short for Joannis)
              with his wife Anna. His wife&rsquo;s maiden name has been confirmed as Anna Gaasch through the
              January 8, 1747 marriage record of their son Nicolas. Jean and Anna&rsquo;s marriage predates 1717
              and does not appear in the Alzingen marriage register — confirming the marriage took place elsewhere.
            </p>
            <p className="section-title">The Roeser Parish Register — A Gaasch Cluster in Bivingen</p>
            <p className="body-text">
              The most significant discovery comes from the Roeser parish register (132 images, beginning 1685).
              The village of Bivingen — approximately 5 kilometers southeast of Alzingen — contains a substantial
              Gaasch family cluster active from at least 1685 through 1700. The Alzingen marriage register also
              records a Nicolaus Gaasch from Bettenburg marrying Catharina Peters of Alzingen in 1727 — a Gaasch
              from a neighboring village, further demonstrating the family network spread across this cluster of villages.
            </p>
            <p className="section-title">Jacques and Simon: Two Brothers, Two Weeks, 1793</p>
            <p className="body-text">
              Jacques Gaasch — Nicolas&rsquo;s firstborn son, Simon&rsquo;s older brother — died February 7, 1793.
              Simon died January 22, 1793. Two brothers died fifteen days apart, in the same village,
              at the exact moment French Revolutionary armies were closing in on Luxembourg.
              The timing is haunting: leaving young Jacobus — age four — as the next male Gaasch of his generation.
            </p>
            <p className="section-title">Where to Search Next</p>
            <p className="body-text">
              Continue browsing the Roeser register from image 20 onward. Search neighboring parish registers —
              Hesperange town, Itzig, Fentange — for a Gaasch marriage record approximately 1710–1718.
              The Archives Nationales de Luxembourg in Luxembourg City holds original registers and can be
              contacted for research assistance.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="pub-footer">
          <span className="pub-footer-ornament">✦ ✦ ✦</span>
          The Gaasch Family — A History Across Ten Generations<br />
          Alzingen, Luxembourg · 17th Century — Bailey County, Texas · Present
          <br /><br />
          Compiled 2024–2026 · Primary sources: FamilySearch Luxemburg Kirchenbücher 1601–1796
        </footer>
      </div>
    </>
  );
}
