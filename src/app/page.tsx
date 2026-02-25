export default function HomePage() {
  return (
    <main style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Gaasch Family History</h1>
      <p>
        Ten generations of the direct Gaasch paternal line, from Jean Gaasch (c. 1698,
        Alzingen, Luxembourg) to Kevin Gaasch (present).
      </p>
      <p style={{ marginTop: '2rem', color: '#666' }}>
        Next.js + Supabase scaffold ready. Run <code>npm run db:seed</code> after
        configuring <code>.env.local</code> to import the 1,798-person dataset.
      </p>
    </main>
  );
}
