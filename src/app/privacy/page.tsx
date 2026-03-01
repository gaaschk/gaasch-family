import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Family History',
};

export default function PrivacyPage() {
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
            <h1 style={{ fontSize: '2rem' }}>Privacy Policy</h1>
            <p className="chapter-meta">Effective {effective}</p>
          </div>

          <div className="body-text" style={{ lineHeight: 1.8 }}>

            <p className="section-title" style={{ marginTop: '2rem' }}>1. Overview</p>
            <p>
              Family History (<strong>family.kevingaasch.com</strong>) is a private, invitation-only genealogy platform
              operated by Kevin Gaasch for use by family members and invited guests. This policy explains what personal
              information we collect, how we use it, and your rights regarding that information.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>2. Information We Collect</p>
            <p><strong>Account information.</strong> When you create an account or accept an invitation, we collect your
            name, email address, and a hashed password. We do not collect payment information.</p>
            <p><strong>Genealogical data.</strong> The platform stores family tree records — names, birth and death
            dates, locations, relationships, and biographical narratives — that are entered by tree administrators.
            Most of this data relates to deceased individuals.</p>
            <p><strong>Usage data.</strong> We log standard server-side request information (IP address, browser,
            pages visited) for security and debugging purposes. We do not use third-party analytics.</p>
            <p><strong>Third-party OAuth tokens.</strong> If you choose to connect a FamilySearch or Geni account,
            we store OAuth access tokens on your behalf to search those services for matching records. We store only
            the token — we do not mirror or retain data from those services beyond what you explicitly accept into
            your tree.</p>

            <p className="section-title" style={{ marginTop: '2rem' }}>3. How We Use Your Information</p>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
              <li>To authenticate you and provide access to the platform</li>
              <li>To display your family tree data to you and other authorized members of your tree</li>
              <li>To generate AI-assisted biographical narratives using Anthropic&rsquo;s Claude (only when
              explicitly triggered by a tree administrator; data is sent to Anthropic&rsquo;s API)</li>
              <li>To search FamilySearch or Geni on your behalf when you use the record-matching feature</li>
              <li>To send tree invitation emails when a tree administrator invites you</li>
            </ul>
            <p>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>

            <p className="section-title" style={{ marginTop: '2rem' }}>4. Data Storage and Security</p>
            <p>
              Data is stored in a SQLite database on a private server. We use industry-standard practices including
              password hashing (bcrypt), encrypted HTTPS connections, and session tokens. Access to the platform
              requires authentication. Tree data is scoped — members of one tree cannot access another tree&rsquo;s data.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>5. Data Retention</p>
            <p>
              Your account and tree data are retained for as long as you have an account on the platform. You may
              request deletion of your account and associated personal data by contacting the platform administrator
              at <a href="mailto:gaaschk@gmail.com" style={{ color: 'var(--rust)' }}>gaaschk@gmail.com</a>.
              Genealogical records about deceased individuals may be retained at the discretion of the tree owner.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>6. Cookies and Sessions</p>
            <p>
              We use a single session cookie to keep you signed in. This cookie contains a signed JWT and is
              required for the platform to function. We do not use advertising cookies or tracking cookies.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>7. Children&rsquo;s Privacy</p>
            <p>
              This platform is not directed at children under 13. We do not knowingly collect personal information
              from children. Access requires an invitation from a tree administrator.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>8. Changes to This Policy</p>
            <p>
              We may update this policy as the platform evolves. Changes will be posted at this URL. Continued use
              of the platform after changes constitutes acceptance of the updated policy.
            </p>

            <p className="section-title" style={{ marginTop: '2rem' }}>9. Contact</p>
            <p>
              Questions about this policy can be directed to{' '}
              <a href="mailto:gaaschk@gmail.com" style={{ color: 'var(--rust)' }}>gaaschk@gmail.com</a>.
            </p>
          </div>

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(196,150,42,0.2)' }}>
            <Link href="/tos" style={{ color: 'var(--rust)', fontSize: '0.85rem' }}>Terms of Service &rarr;</Link>
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
