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
      {/* ── Top bar ── */}
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #e8e0d8',
        padding: '0 40px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#2c1810', letterSpacing: -0.5 }}>
          heir<span style={{ color: '#8b5e3c' }}>loom</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#features" style={{ fontSize: 14, color: '#7a6a5a', textDecoration: 'none' }}>Features</a>
          <a href="#citizenship" style={{ fontSize: 14, color: '#7a6a5a', textDecoration: 'none' }}>Citizenship</a>
          <Link
            href="/login"
            style={{
              padding: '9px 20px',
              borderRadius: 7,
              fontSize: 14,
              fontWeight: 500,
              background: 'white',
              border: '1px solid #e8e0d8',
              color: '#2c1810',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              padding: '9px 20px',
              borderRadius: 7,
              fontSize: 14,
              fontWeight: 500,
              background: '#8b5e3c',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #2c1810 0%, #5c3420 50%, #8b5e3c 100%)',
        color: 'white',
        padding: '100px 40px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.5,
            color: '#c4935a',
            marginBottom: 24,
          }}>
            Genealogy + European Citizenship
          </div>
          <h1 style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 20,
            letterSpacing: -1,
          }}>
            Your ancestors may have left you<br />
            a European passport.
          </h1>
          <p style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.6,
            marginBottom: 36,
            maxWidth: 540,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Many Americans qualify for EU citizenship through ancestry and don&apos;t know it.
            Heirloom helps you build the family tree that proves it.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link
              href="/signup"
              style={{
                padding: '14px 32px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                background: 'white',
                color: '#2c1810',
                textDecoration: 'none',
              }}
            >
              Start your tree — free
            </Link>
            <a
              href="#citizenship"
              style={{
                padding: '14px 32px',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                textDecoration: 'none',
              }}
            >
              How it works
            </a>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 16 }}>
            No credit card required
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          color: '#8b5e3c',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          What you get
        </p>
        <h2 style={{
          fontSize: 32,
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: 48,
          color: '#2c1810',
        }}>
          What Heirloom does today
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
        }}>
          {([
            { icon: '🌳', title: 'Interactive Family Tree', body: 'Pedigree, fan, and family views with a visual explorer. Import a GEDCOM file or build from scratch.' },
            { icon: '📖', title: 'AI Ancestry Narratives', body: 'Generate rich biographical stories for each ancestor, woven from the dates, places, and relationships you\'ve recorded.' },
            { icon: '🔍', title: 'Record Hints', body: 'Cross-reference your tree against FamilySearch, WikiTree, and Geni to surface matching records you may have missed.' },
            { icon: '👥', title: 'Family Collaboration', body: 'Invite relatives to view, edit, or contribute to your tree. Each tree has its own members and privacy.' },
            { icon: '🇪🇺', title: 'Citizenship Research', body: 'Organize the genealogical evidence you need to pursue European citizenship by descent — the records, the lineage, the proof.' },
            { icon: '📄', title: 'GEDCOM Import & Export', body: 'Bring in trees from other genealogy tools via GEDCOM, or export your Heirloom tree for use elsewhere.' },
          ] as const).map(({ icon, title, body }) => (
            <div key={title} style={{
              background: 'white',
              borderRadius: 12,
              border: '1px solid #e8e0d8',
              padding: '32px 24px',
            }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#2c1810' }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#7a6a5a', lineHeight: 1.6, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Citizenship callout ── */}
      <section id="citizenship" style={{
        background: 'linear-gradient(135deg, #fdf6ef, #f0ebe3)',
        border: '1px solid #e8d8c8',
        borderRadius: 16,
        padding: 48,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 40,
        alignItems: 'center',
        maxWidth: 1100,
        margin: '0 auto 80px',
      }}>
        <div>
          <div style={{ display: 'flex', gap: 12, fontSize: 28, marginBottom: 20 }}>
            🇱🇺 🇩🇪 🇮🇪 🇮🇹 🇵🇱 🇭🇺 🇨🇿 🇦🇹
          </div>
          <h3 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12, color: '#2c1810' }}>
            European citizenship could be hiding in your tree
          </h3>
          <p style={{ fontSize: 15, color: '#7a6a5a', lineHeight: 1.6, marginBottom: 20 }}>
            If your grandparents or great-grandparents emigrated from Europe,
            you may qualify for citizenship by descent. Heirloom helps you build the
            genealogical record you&apos;ll need to find out.
          </p>
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              padding: '9px 20px',
              borderRadius: 7,
              fontSize: 14,
              fontWeight: 500,
              background: '#8b5e3c',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Start your tree
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {([
            { num: '1', title: 'Build or import your tree', desc: 'Add your ancestors manually or import a GEDCOM file from another tool.' },
            { num: '2', title: 'Find record matches', desc: 'Cross-reference your tree with FamilySearch, WikiTree, and Geni to fill gaps.' },
            { num: '3', title: 'Research your eligibility', desc: 'Use your documented lineage to determine which citizenship paths may apply.' },
          ] as const).map(({ num, title, desc }) => (
            <div key={num} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: '14px 16px',
              background: 'white',
              borderRadius: 10,
              border: '1px solid #e8e0d8',
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#8b5e3c',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {num}
              </div>
              <div style={{ fontSize: 14, color: '#2c1810', lineHeight: 1.5 }}>
                <strong style={{ display: 'block', marginBottom: 2 }}>{title}</strong>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why genealogy + citizenship ── */}
      <section style={{
        background: 'white',
        borderTop: '1px solid #e8e0d8',
        borderBottom: '1px solid #e8e0d8',
        padding: '48px 40px',
        textAlign: 'center',
        maxWidth: 800,
        margin: '0 auto',
      }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2c1810', marginBottom: 12 }}>
          Why build your tree with citizenship in mind?
        </h3>
        <p style={{ fontSize: 15, color: '#7a6a5a', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>
          Countries like Luxembourg, Germany, Ireland, Italy, Poland, and Hungary offer citizenship
          to descendants of their nationals — sometimes going back several generations. The key is
          proving an unbroken lineage with the right records. Heirloom is built to help you
          organize that research from day one.
        </p>
      </section>

      {/* ── Footer CTA ── */}
      <section style={{ textAlign: 'center', padding: '80px 40px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
          Ready to start?
        </h2>
        <p style={{ fontSize: 15, color: '#7a6a5a', marginBottom: 28 }}>
          Create your tree and start researching — it&apos;s free.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            padding: '14px 36px',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            background: '#8b5e3c',
            color: 'white',
            textDecoration: 'none',
          }}
        >
          Create your free account
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: '#2c1810',
        color: 'rgba(255,255,255,0.5)',
        padding: 40,
        textAlign: 'center',
        fontSize: 13,
      }}>
        <span style={{ color: 'white', fontSize: 18, fontWeight: 700, display: 'block', marginBottom: 8 }}>
          heir<span style={{ color: '#8b5e3c' }}>loom</span>
        </span>
        &copy; 2026 Heirloom
      </footer>
    </>
  );
}
