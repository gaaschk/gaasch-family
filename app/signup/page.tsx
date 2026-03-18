"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
        setTimeout(() => router.push("/awaiting-approval"), 2000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: "var(--surface-base)" }}
      >
        <div className="text-center max-w-sm">
          <h1
            className="font-display"
            style={{ fontSize: "1.875rem", fontWeight: 600, color: "var(--brown-text)", marginBottom: "1rem" }}
          >
            Request submitted
          </h1>
          <p className="font-narrative" style={{ color: "var(--brown-muted)" }}>
            An admin will review your request and send you an email when approved.
          </p>
        </div>
      </main>
    );
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
            style={{ fontSize: "1.875rem", fontWeight: 600, color: "var(--brown-text)", marginBottom: "0.5rem" }}
          >
            Request access
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--brown-muted)" }}>
            Heirloom is invite-only. An admin will approve your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error && (
            <p
              role="alert"
              style={{
                color: "var(--color-error)",
                fontSize: "0.875rem",
                padding: "0.75rem 1rem",
                background: "color-mix(in srgb, var(--color-error) 8%, transparent)",
                borderRadius: "var(--radius-md)",
                border: "1px solid color-mix(in srgb, var(--color-error) 20%, transparent)",
              }}
            >
              {error}
            </p>
          )}

          {(["name", "email", "password"] as const).map((field) => (
            <div key={field} style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label
                htmlFor={field}
                className="font-ui"
                style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)" }}
              >
                {field === "name" ? "Full name" : field === "email" ? "Email" : "Password"}
              </label>
              <input
                id={field}
                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                autoComplete={field === "name" ? "name" : field === "email" ? "email" : "new-password"}
                required
                minLength={field === "password" ? 8 : 1}
                value={field === "name" ? name : field === "email" ? email : password}
                onChange={(e) => {
                  if (field === "name") setName(e.target.value);
                  else if (field === "email") setEmail(e.target.value);
                  else setPassword(e.target.value);
                }}
                style={{
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--cream-border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color var(--duration-short) var(--ease-out)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--forest)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
              />
              {field === "password" && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  At least 8 characters
                </p>
              )}
            </div>
          ))}

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
            {loading ? "Submitting…" : "Request access"}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
            }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              style={{ color: "var(--text-link)", textDecoration: "underline" }}
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
