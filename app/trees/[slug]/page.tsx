export default async function TreePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main
      className="p-8"
      style={{ background: "var(--surface-base)", minHeight: "100vh" }}
    >
      <h1
        className="font-display text-3xl font-semibold mb-4"
        style={{ color: "var(--brown-text)" }}
      >
        Tree: {slug}
      </h1>
      <p style={{ color: "var(--brown-muted)" }}>Tree explorer coming soon.</p>
    </main>
  );
}
