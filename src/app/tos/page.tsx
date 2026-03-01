import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Family History',
};

export default function TosPage() {
  const effective = 'March 1, 2026';

  return (
    <>
      <nav className="pub-nav">
        <Link href="/" className="pub-nav-title" style={{ textDecoration: 'none' }}>Family History</Link>
        <Link href="/login" className="pub-nav-admin">Sign in</Link>
      </nav>

      <div className="pub-page">
        <div className="section-wrap" style={{ maxWidth: 720, padding: '3rem 1.5rem 5rem' }}>
          <div className="chapter-header" style={{ marginBottom: '2.5rem' }}>
            <span className="chapter-num">Legal</span>
            <h1 style={{ fontSize: '2rem' }}>Terms of Service</h1>
            <p className="chapter-meta">Effective {effective}</p>
          </div>

          <div className="body-text" style={{ lineHeight: 1.8 }}>

            <p className="section-title" style={{ marginTop: '2rem' }}>1. Acceptance</p>
            <p>
              By accessing or using Family History at <strong>family.kevingaasch.com</strong> (&ldquo;the platform&rdquo;),
              you agree to these Terms of Service. If you do not agree, do not use the platform.
              Access is granted by invitation only at the sole discretion of the platform administrator.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>2. Access and Accounts</p>
            <p>
              You must be invited by a tree administrator to create an account. You are responsible for
              maintaining the confidentiality of your credentials and for all activity under your account.
              Sharing your login credentials with others is not permitted.
            </p>
            <p>
              New accounts are placed in a &ldquo;pending&rdquo; state until approved by an administrator. We reserve
              the right to deny or revoke access at any time without notice.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>3. Acceptable Use</p>
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>Share, publish, or redistribute tree data, narratives, or personal information without authorization</li>
              <li>Attempt to access tree data belonging to trees you are not a member of</li>
              <li>Use the platform to harass, defame, or harm any person</li>
              <li>Use automated tools to scrape or bulk-download content</li>
              <li>Attempt to reverse-engineer, decompile, or interfere with the platform&rsquo;s security</li>
              <li>Use the platform for any unlawful purpose</li>
            </ul>

            <p className="section-title" style={{ marginTop: '2rem' }}>4. Content and Data</p>
            <p>
              Tree owners and editors are responsible for the accuracy of genealogical data they enter.
              AI-generated biographical narratives are produced by Anthropic&rsquo;s Claude and may contain
              inaccuracies — they should be treated as a starting point, not as definitive historical record.
            </p>
            <p>
              You retain ownership of genealogical data you contribute. By entering data, you grant the
              platform a limited license to store and display that data to authorized members of your tree.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>5. Third-Party Services</p>
            <p>
              The platform integrates with FamilySearch and Geni for optional record matching, and uses
              Anthropic&rsquo;s Claude API for narrative generation. Your use of these integrations is subject
              to the terms of those respective services. We are not responsible for the accuracy or
              availability of third-party data.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>6. Privacy of Living Persons</p>
            <p>
              You must not enter detailed personal information about living individuals — including home
              addresses, financial details, or sensitive personal data — without their consent. The
              platform is designed for genealogical records, primarily relating to deceased ancestors.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>7. Disclaimers</p>
            <p>
              The platform is provided &ldquo;as is&rdquo; without warranty of any kind. We make no guarantees
              regarding uptime, data durability, or the accuracy of AI-generated content. Use of the
              platform is at your own risk. We strongly recommend maintaining independent backups of
              your genealogical data using the export feature.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>8. Limitation of Liability</p>
            <p>
              To the fullest extent permitted by law, the platform operator shall not be liable for any
              indirect, incidental, or consequential damages arising from your use of the platform,
              including loss of data.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>9. Termination</p>
            <p>
              We may suspend or terminate your access at any time for any reason. You may request
              deletion of your account by contacting{' '}
              <a href="mailto:gaaschk@gmail.com" style={{ color: 'var(--rust)' }}>gaaschk@gmail.com</a>.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>10. Changes</p>
            <p>
              We may update these terms at any time. Changes will be posted at this URL. Continued use
              of the platform constitutes acceptance of the revised terms.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>11. Contact</p>
            <p>
              Questions about these terms can be directed to{' '}
              <a href="mailto:gaaschk@gmail.com" style={{ color: 'var(--rust)' }}>gaaschk@gmail.com</a>.
            </p>

          </div>

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(196,150,42,0.2)' }}>
            <Link href="/privacy" style={{ color: 'var(--rust)', fontSize: '0.85rem' }}>Privacy Policy &rarr;</Link>
          </div>
        </div>

        <footer className="pub-footer">
          <span className="pub-footer-ornament">✦ ✦ ✦</span>
          Family History — Private genealogy platform
        </footer>
      </div>
    </>
  );
}
