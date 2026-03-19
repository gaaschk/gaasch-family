"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setDone(true);
        timerRef.current = setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "var(--surface-base)" }}
    >
      <div className="w-full max-w-sm">
        <div style={{ marginBottom: "2rem" }}>
          <h1
            className="font-display"
            style={{
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--brown-text)",
              marginBottom: "0.5rem",
            }}
          >
            Set a new password
          </h1>
        </div>

        {done ? (
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "color-mix(in srgb, var(--forest) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--forest) 20%, transparent)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
            }}
          >
            Password updated. Redirecting you to sign in…
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {error && (
              <p
                role="alert"
                style={{
                  color: "var(--color-error)",
                  fontSize: "0.875rem",
                  padding: "0.75rem 1rem",
                  background:
                    "color-mix(in srgb, var(--color-error) 8%, transparent)",
                  borderRadius: "var(--radius-md)",
                  border:
                    "1px solid color-mix(in srgb, var(--color-error) 20%, transparent)",
                }}
              >
                {error}
              </p>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              <label
                htmlFor="password"
                className="font-ui"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--cream-border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  outline: "none",
                  transition:
                    "border-color var(--duration-short) var(--ease-out)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--forest)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--cream-border)";
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              <label
                htmlFor="confirm"
                className="font-ui"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={{
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--cream-border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  outline: "none",
                  transition:
                    "border-color var(--duration-short) var(--ease-out)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--forest)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--cream-border)";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "var(--radius-md)",
                background: loading ? "var(--brown-light)" : "var(--forest)",
                color: "#fff",
                fontFamily: "var(--font-ui)",
                fontWeight: 600,
                fontSize: "1rem",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background var(--duration-short) var(--ease-out)",
              }}
            >
              {loading ? "Saving…" : "Set new password"}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              <Link
                href="/login"
                style={{
                  color: "var(--text-link)",
                  textDecoration: "underline",
                }}
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
