"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const errorParam = searchParams.get("error");
  const fromSignup = searchParams.get("from") === "signup";

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
    >
      {fromSignup && !error && (
        <output
          style={{
            color: "var(--forest)",
            fontSize: "0.875rem",
            padding: "0.75rem 1rem",
            background: "var(--forest-bg)",
            borderRadius: "var(--radius-md)",
            border:
              "1px solid color-mix(in srgb, var(--forest) 20%, transparent)",
            display: "block",
          }}
        >
          Account created! Sign in to get started.
        </output>
      )}

      {(error ?? errorParam) && (
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
          {error ?? "Authentication failed. Please try again."}
        </p>
      )}

      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
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
            transition: "border-color var(--duration-short) var(--ease-out)",
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
        style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
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
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
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
            transition: "border-color var(--duration-short) var(--ease-out)",
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
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.875rem",
          color: "var(--text-muted)",
        }}
      >
        <Link
          href="/forgot-password"
          style={{ color: "var(--text-link)", textDecoration: "underline" }}
        >
          Forgot password?
        </Link>
        <span>
          New here?{" "}
          <Link
            href="/signup"
            style={{ color: "var(--text-link)", textDecoration: "underline" }}
          >
            Create a free account
          </Link>
        </span>
      </div>
    </form>
  );
}
