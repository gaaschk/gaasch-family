"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type InviteInfo = {
  email: string;
  role: string;
  treeName: string;
  treeSlug: string;
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "error" | "accepting" | "done"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error ?? "This invitation is not valid.");
          setStatus("error");
        } else {
          setInfo(data);
          setStatus("ready");
        }
      })
      .catch(() => {
        setErrorMsg("Something went wrong loading this invitation.");
        setStatus("error");
      });
  }, [token]);

  async function accept() {
    setStatus("accepting");
    try {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "UNAUTHENTICATED") {
          // redirect to login then back
          router.push(`/login?callbackUrl=/invite/${token}`);
          return;
        }
        setErrorMsg(data.error ?? "Failed to accept invite.");
        setStatus("error");
      } else {
        setStatus("done");
        setTimeout(() => router.push(`/trees/${data.treeSlug}`), 1500);
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "var(--surface-base)" }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "28rem",
          width: "100%",
          background: "var(--surface-raised)",
          border: "1px solid var(--cream-border)",
          borderRadius: "var(--radius-lg)",
          padding: "2.5rem 2rem",
        }}
      >
        {status === "loading" && (
          <p style={{ color: "var(--text-muted)" }}>Loading invitation…</p>
        )}

        {status === "error" && (
          <>
            <h1
              className="font-display"
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "var(--brown-text)",
                marginBottom: "0.75rem",
              }}
            >
              Invitation unavailable
            </h1>
            <p style={{ color: "var(--brown-muted)", marginBottom: "1.5rem" }}>
              {errorMsg}
            </p>
            <Link
              href="/dashboard"
              style={{
                padding: "0.625rem 1.25rem",
                borderRadius: "var(--radius-md)",
                background: "var(--forest)",
                color: "#fff",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go to dashboard
            </Link>
          </>
        )}

        {(status === "ready" || status === "accepting") && info && (
          <>
            <h1
              className="font-display"
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "var(--brown-text)",
                marginBottom: "0.5rem",
              }}
            >
              You&apos;ve been invited
            </h1>
            <p style={{ color: "var(--brown-muted)", marginBottom: "1.75rem" }}>
              Join{" "}
              <strong style={{ color: "var(--brown-text)" }}>
                {info.treeName}
              </strong>{" "}
              as a{" "}
              <strong style={{ color: "var(--brown-text)" }}>
                {cap(info.role)}
              </strong>
              .
            </p>
            <button
              type="button"
              onClick={accept}
              disabled={status === "accepting"}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background:
                  status === "accepting"
                    ? "var(--brown-light)"
                    : "var(--forest)",
                color: "#fff",
                fontFamily: "var(--font-ui)",
                fontWeight: 600,
                fontSize: "1rem",
                border: "none",
                cursor: status === "accepting" ? "not-allowed" : "pointer",
                transition: "background var(--duration-short) var(--ease-out)",
                marginBottom: "1rem",
              }}
            >
              {status === "accepting" ? "Accepting…" : "Accept invitation"}
            </button>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Not you? Make sure you&apos;re signed in as{" "}
              <strong>{info.email}</strong>.
            </p>
          </>
        )}

        {status === "done" && (
          <>
            <h1
              className="font-display"
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "var(--brown-text)",
                marginBottom: "0.5rem",
              }}
            >
              Welcome!
            </h1>
            <p style={{ color: "var(--brown-muted)" }}>
              Redirecting you to the tree…
            </p>
          </>
        )}
      </div>
    </main>
  );
}
