import Link from "next/link";

export default function LandingPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ background: "var(--surface-base)" }}
    >
      <h1
        className="font-display text-5xl font-semibold mb-4"
        style={{ color: "var(--brown-text)" }}
      >
        Heirloom
      </h1>
      <p
        className="font-narrative text-xl mb-8"
        style={{ color: "var(--brown-muted)" }}
      >
        Preserve your family&apos;s story. Free to start.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="px-6 py-3 rounded-lg font-ui font-medium transition-colors"
          style={{ background: "var(--forest)", color: "var(--text-inverse)" }}
        >
          Create your tree
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 rounded-lg font-ui font-medium border transition-colors"
          style={{
            borderColor: "var(--cream-border)",
            color: "var(--brown-text)",
          }}
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
