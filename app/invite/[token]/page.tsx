export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "var(--surface-base)" }}
    >
      <div className="text-center max-w-md">
        <h1
          className="font-display text-3xl font-semibold mb-4"
          style={{ color: "var(--brown-text)" }}
        >
          You&apos;ve been invited
        </h1>
        <p style={{ color: "var(--brown-muted)" }}>
          Invite acceptance for token {token} coming soon.
        </p>
      </div>
    </main>
  );
}
