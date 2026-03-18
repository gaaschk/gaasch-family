"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PersonData = {
  firstName?: string;
  lastName?: string;
  maidenName?: string;
  gender?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  occupation?: string;
  notes?: string;
};

export default function PersonForm({
  treeId,
  treeSlug,
  mode,
  personId,
  initial,
}: {
  treeId: string;
  treeSlug: string;
  mode: "create" | "edit";
  personId?: string;
  initial?: PersonData;
}) {
  const router = useRouter();
  const [data, setData] = useState<PersonData>(initial ?? {});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof PersonData, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url =
        mode === "create"
          ? `/api/trees/${treeId}/people`
          : `/api/trees/${treeId}/people/${personId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
      } else {
        router.push(`/trees/${treeSlug}/people/${body.id}`);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.625rem 0.875rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--cream-border)",
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    fontSize: "1rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color var(--duration-short) var(--ease-out)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "0.375rem",
    display: "block",
  };

  const field = (
    id: keyof PersonData,
    label: string,
    opts?: { half?: boolean; type?: string },
  ) => (
    <div style={opts?.half ? {} : { gridColumn: "1 / -1" }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <input
        id={id}
        type={opts?.type ?? "text"}
        value={data[id] ?? ""}
        onChange={(e) => set(id, e.target.value)}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--forest)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--cream-border)";
        }}
      />
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
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

      {/* Name section */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          className="font-ui"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--brown-muted)",
            marginBottom: "1rem",
          }}
        >
          Name
        </legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          {field("firstName", "First name", { half: true })}
          {field("lastName", "Last name", { half: true })}
          {field("maidenName", "Maiden name", { half: true })}
          <div>
            <label htmlFor="gender" style={labelStyle}>
              Gender
            </label>
            <select
              id="gender"
              value={data.gender ?? ""}
              onChange={(e) => set("gender", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--forest)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--cream-border)";
              }}
            >
              <option value="">Unknown</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="U">Other</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Birth section */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          className="font-ui"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--brown-muted)",
            marginBottom: "1rem",
          }}
        >
          Birth
        </legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          {field("birthDate", "Date", { half: true })}
          {field("birthPlace", "Place", { half: true })}
        </div>
      </fieldset>

      {/* Death section */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          className="font-ui"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--brown-muted)",
            marginBottom: "1rem",
          }}
        >
          Death
        </legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          {field("deathDate", "Date", { half: true })}
          {field("deathPlace", "Place", { half: true })}
        </div>
      </fieldset>

      {/* Other */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend
          className="font-ui"
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--brown-muted)",
            marginBottom: "1rem",
          }}
        >
          More
        </legend>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {field("occupation", "Occupation")}
          <div>
            <label htmlFor="notes" style={labelStyle}>
              Notes
            </label>
            <textarea
              id="notes"
              value={data.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
                fontFamily: "var(--font-narrative)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--forest)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--cream-border)";
              }}
            />
          </div>
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
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
          disabled={loading}
          style={{
            flex: 1,
            padding: "0.75rem 1.5rem",
            borderRadius: "var(--radius-md)",
            background: loading ? "var(--brown-light)" : "var(--forest)",
            color: "#fff",
            fontFamily: "var(--font-ui)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background var(--duration-short) var(--ease-out)",
          }}
        >
          {loading
            ? "Saving…"
            : mode === "create"
              ? "Add person"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
