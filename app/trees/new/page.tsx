"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function slugPreview(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default function NewTreePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const slug = slugPreview(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        router.push(`/trees/${data.slug}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    padding: "0.625rem 0.875rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--cream-border)",
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    transition: "border-color var(--duration-short) var(--ease-out)",
  };

  const labelStyle = {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
  } as const;

  return (
    <main
      style={{
        maxWidth: "36rem",
        margin: "0 auto",
        padding: "3rem 1.5rem",
        minHeight: "100vh",
        background: "var(--surface-base)",
      }}
    >
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-display"
          style={{ fontSize: "2rem", fontWeight: 600, color: "var(--brown-text)", marginBottom: "0.5rem" }}
        >
          Create a tree
        </h1>
        <p style={{ color: "var(--brown-muted)" }}>
          A tree holds your family records, people, and stories.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="name" className="font-ui" style={labelStyle}>
            Tree name <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Gaasch Family"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--forest)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
          />
          {slug && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              URL: <code style={{ fontFamily: "var(--font-mono)" }}>/trees/{slug}</code>
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <label htmlFor="description" className="font-ui" style={labelStyle}>
            Description <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short description of this family tree…"
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              fontFamily: "var(--font-ui)",
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--forest)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              flex: "0 0 auto",
              padding: "0.75rem 1.25rem",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-raised)",
              border: "1px solid var(--cream-border)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-ui)",
              fontWeight: 500,
              fontSize: "0.9375rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              flex: 1,
              padding: "0.75rem 1.5rem",
              borderRadius: "var(--radius-md)",
              background: loading || !name.trim() ? "var(--brown-light)" : "var(--forest)",
              color: "#fff",
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              fontSize: "0.9375rem",
              border: "none",
              cursor: loading || !name.trim() ? "not-allowed" : "pointer",
              transition: "background var(--duration-short) var(--ease-out)",
            }}
          >
            {loading ? "Creating…" : "Create tree"}
          </button>
        </div>
      </form>
    </main>
  );
}
