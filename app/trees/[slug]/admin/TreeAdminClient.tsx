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
