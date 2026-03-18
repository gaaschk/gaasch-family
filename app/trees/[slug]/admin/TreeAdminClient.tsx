"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Member = {
  id: string;
  userId: string;
  role: string;
  name: string | null;
  email: string;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

const sectionLabel: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "var(--brown-muted)",
  marginBottom: "1rem",
};

const card: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--cream-border)",
  borderRadius: "var(--radius-lg)",
  padding: "1rem 1.25rem",
  display: "flex",
  alignItems: "center",
  gap: "1rem",
};

function GedcomImport({ treeId, onImported }: { treeId: string; onImported: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/trees/${treeId}/import`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed.");
      } else {
        setResult(`Imported ${data.personsImported} people and ${data.familiesImported} families.`);
        onImported();
      }
    } catch {
      setError("Something went wrong during import.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  const sLabel: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--brown-muted)",
    marginBottom: "1rem",
  };

  return (
    <section>
      <h2 style={sLabel}>GEDCOM import</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
        Import people and families from a <code>.ged</code> file. Existing records with matching GEDCOM IDs will be updated.
      </p>
      <label
        style={{
          display: "inline-block",
          padding: "0.5rem 1.25rem",
          borderRadius: "var(--radius-md)",
          background: loading ? "var(--brown-light)" : "var(--forest)",
          color: "#fff",
          fontFamily: "var(--font-ui)",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Importing…" : "Choose .ged file"}
        <input type="file" accept=".ged,.gedcom" onChange={handleFile} style={{ display: "none" }} disabled={loading} />
      </label>
      {result && <p style={{ color: "var(--color-success)", fontSize: "0.875rem", marginTop: "0.75rem" }}>{result}</p>}
      {error && <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginTop: "0.75rem" }}>{error}</p>}
    </section>
  );
}

function TreeSettings({ treeId }: { treeId: string }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-haiku-4-5-20251001");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/trees/${treeId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Save failed.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const sLabel: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--brown-muted)",
    marginBottom: "1rem",
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--cream-border)",
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    fontSize: "0.9375rem",
    outline: "none",
    flex: 1,
    minWidth: 0,
  };

  return (
    <section>
      <h2 style={sLabel}>AI narrative settings</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
        Configure the Anthropic API key used to generate biographical narratives for people in this tree.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
            Anthropic API key
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="password"
              placeholder="sk-ant-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--forest)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
            />
            <button
              onClick={() => saveSetting("anthropic_api_key", apiKey)}
              disabled={saving || !apiKey.trim()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                background: saving || !apiKey.trim() ? "var(--brown-light)" : "var(--forest)",
                color: "#fff",
                fontFamily: "var(--font-ui)",
                fontWeight: 600,
                fontSize: "0.875rem",
                border: "none",
                cursor: saving || !apiKey.trim() ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: "0.375rem" }}>
            Model
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", maxWidth: "20rem" }}
            >
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fast, low cost)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (higher quality)</option>
              <option value="claude-opus-4-6">Claude Opus 4.6 (best quality)</option>
            </select>
            <button
              onClick={() => saveSetting("anthropic_model", model)}
              disabled={saving}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                background: saving ? "var(--brown-light)" : "var(--forest)",
                color: "#fff",
                fontFamily: "var(--font-ui)",
                fontWeight: 600,
                fontSize: "0.875rem",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {saved && <p style={{ color: "var(--color-success)", fontSize: "0.875rem" }}>Saved.</p>}
        {error && <p style={{ color: "var(--color-error)", fontSize: "0.875rem" }}>{error}</p>}
      </div>
    </section>
  );
}

export default function TreeAdminClient({
  treeId,
  treeName: _treeName,
  treeSlug: _treeSlug,
  members: initialMembers,
  pendingInvites: initialInvites,
  currentUserId,
}: {
  treeId: string;
  treeName: string;
  treeSlug: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  async function updateMemberRole(memberId: string, userId: string, role: string) {
    if (userId === currentUserId && role !== "admin") {
      if (!confirm("You are demoting yourself. You may lose admin access. Continue?")) return;
    }
    setLoadingId(memberId);
    try {
      await fetch(`/api/trees/${treeId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } finally {
      setLoadingId(null);
    }
  }

  async function removeMember(memberId: string, userId: string) {
    if (userId === currentUserId) {
      if (!confirm("Remove yourself from this tree?")) return;
    }
    setLoadingId(memberId);
    try {
      await fetch(`/api/trees/${treeId}/members/${memberId}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      if (userId === currentUserId) router.push("/dashboard");
    } finally {
      setLoadingId(null);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/trees/${treeId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Failed to send invite.");
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        router.refresh();
      }
    } catch {
      setInviteError("Something went wrong.");
    } finally {
      setInviteLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--cream-border)",
    background: "var(--surface-raised)",
    color: "var(--text-primary)",
    fontSize: "0.9375rem",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
      {/* Members */}
      <section>
        <h2 style={sectionLabel}>Members ({members.length})</h2>
        {members.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No members yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {members.map((m) => (
              <div key={m.id} style={card}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {m.name ?? "(no name)"}
                    {m.userId === currentUserId && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                        (you)
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{m.email}</p>
                </div>
                <select
                  value={m.role}
                  disabled={loadingId === m.id}
                  onChange={(e) => updateMemberRole(m.id, m.userId, e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => removeMember(m.id, m.userId)}
                  disabled={loadingId === m.id}
                  style={{
                    padding: "0.375rem 0.625rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
                    background: "transparent",
                    color: "var(--color-error)",
                    fontSize: "0.8125rem",
                    cursor: loadingId === m.id ? "not-allowed" : "pointer",
                    opacity: loadingId === m.id ? 0.5 : 1,
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite form */}
      <section>
        <h2 style={sectionLabel}>Invite someone</h2>
        <form
          onSubmit={sendInvite}
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <input
            type="email"
            required
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 200px", minWidth: "180px" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--forest)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--cream-border)")}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviteLoading}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "var(--radius-md)",
              background: inviteLoading ? "var(--brown-light)" : "var(--forest)",
              color: "#fff",
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              fontSize: "0.9375rem",
              border: "none",
              cursor: inviteLoading ? "not-allowed" : "pointer",
            }}
          >
            {inviteLoading ? "Sending…" : "Send invite"}
          </button>
        </form>

        {inviteError && (
          <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            {inviteError}
          </p>
        )}
        {inviteSuccess && (
          <p style={{ color: "var(--color-success)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            {inviteSuccess}
          </p>
        )}
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section>
          <h2 style={sectionLabel}>Pending invites ({invites.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{ ...card, opacity: 0.8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, color: "var(--text-primary)" }}>{inv.email}</p>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--parchment-deeper)",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Pending
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
            Invites expire after 7 days and are re-sent automatically if you invite the same address again.
          </p>
        </section>
      )}

      {/* GEDCOM import */}
      <GedcomImport treeId={treeId} onImported={() => router.refresh()} />

      {/* Tree settings */}
      <TreeSettings treeId={treeId} />

      {/* Danger zone */}
      <section>
        <h2 style={{ ...sectionLabel, color: "var(--color-error)" }}>Danger zone</h2>
        <div
          style={{
            border: "1px solid color-mix(in srgb, var(--color-error) 25%, transparent)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
          }}
        >
          <p style={{ fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
            Delete this tree
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Permanently deletes all people, families, documents, and settings. This cannot be undone.
          </p>
          <button
            onClick={() => alert("Tree deletion coming in a future update.")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid color-mix(in srgb, var(--color-error) 40%, transparent)",
              background: "transparent",
              color: "var(--color-error)",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete tree…
          </button>
        </div>
      </section>
    </div>
  );
}
