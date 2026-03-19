"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    // Always show the same message regardless of outcome
    setSubmitted(true);
    setLoading(false);
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
            Reset your password
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--brown-muted)" }}>
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        {submitted ? (
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "color-mix(in srgb, var(--forest) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--forest) 20%, transparent)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
              lineHeight: 1.6,
            }}
          >
            If that email is associated with an account, you&apos;ll receive a
            reset link shortly. Check your inbox.
            <div style={{ marginTop: "1rem" }}>
              <Link
                href="/login"
                style={{
                  color: "var(--text-link)",
                  textDecoration: "underline",
                  fontSize: "0.875rem",
                }}
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
              }}
            >
              <label
                htmlFor="email"
                className="font-ui"
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Sending…" : "Send reset link"}
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
