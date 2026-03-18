export default function AwaitingApprovalPage() {
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
          Access Pending
        </h1>
        <p
          className="font-narrative text-lg"
          style={{ color: "var(--brown-muted)" }}
        >
          Your request is under review. You&apos;ll receive an email once
          approved.
        </p>
      </div>
    </main>
  );
}
