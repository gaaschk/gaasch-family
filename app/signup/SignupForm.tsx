"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
        if (res.status === 409) {
          setError(
            "An account with that email already exists. Sign in instead?",
          );
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
      } else {
        router.push("/login?from=signup");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
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
          {error.includes("already exists") && (
            <>
              {" "}
              <a
                href="/login"
                style={{
                  color: "var(--forest)",
                  textDecoration: "underline",
                }}
              >
                Sign in instead
              </a>
            </>
          )}
        </p>
      )}

      {(["name", "email", "password"] as const).map((field) => (
        <div
          key={field}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
          }}
        >
          <label
            htmlFor={field}
            className="font-ui"
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            {field === "name"
              ? "Full name"
              : field === "email"
                ? "Email"
                : "Password"}
          </label>
          <input
            id={field}
            type={
              field === "password"
                ? "password"
                : field === "email"
                  ? "email"
                  : "text"
            }
            autoComplete={
              field === "name"
                ? "name"
                : field === "email"
                  ? "email"
                  : "new-password"
            }
            required
            minLength={field === "password" ? 8 : 1}
            value={
              field === "name" ? name : field === "email" ? email : password
            }
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
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--forest)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--cream-border)";
            }}
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
        }}
      >
        {loading ? "Creating account…" : "Create account"}
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
  );
}
