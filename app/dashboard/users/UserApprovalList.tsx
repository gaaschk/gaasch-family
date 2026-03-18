"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PendingUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
};

type ActiveUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: Date;
};

const ROLE_LABELS: Record<string, string> = {
  viewer: "Viewer",
  editor: "Editor",
  admin: "Admin",
};

const cardStyle = {
  background: "var(--surface-raised)",
  border: "1px solid var(--cream-border)",
  borderRadius: "var(--radius-lg)",
  padding: "1rem 1.25rem",
  display: "flex",
  alignItems: "center",
  gap: "1rem",
};

export default function UserApprovalList({
  pendingUsers,
  allUsers,
}: {
  pendingUsers: PendingUser[];
  allUsers: ActiveUser[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function approve(userId: string, role: "viewer" | "editor" | "admin") {
    setLoadingId(userId);
    try {
      await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function changeRole(userId: string, role: string) {
    setLoadingId(userId);
    try {
      await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      {/* Pending */}
      <section>
        <h2
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
          Pending approval ({pendingUsers.length})
        </h2>

        {pendingUsers.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            No pending requests.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pendingUsers.map((u) => (
              <div key={u.id} style={cardStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {u.name ?? "(no name)"}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {u.email}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {(["viewer", "editor", "admin"] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => approve(u.id, role)}
                      disabled={loadingId === u.id}
                      style={{
                        padding: "0.375rem 0.75rem",
                        borderRadius: "var(--radius-md)",
                        background:
                          role === "admin"
                            ? "var(--amber)"
                            : role === "editor"
                            ? "var(--forest)"
                            : "var(--forest-light)",
                        color: "#fff",
                        border: "none",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        cursor: loadingId === u.id ? "not-allowed" : "pointer",
                        opacity: loadingId === u.id ? 0.6 : 1,
                      }}
                    >
                      Approve as {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active users */}
      <section>
        <h2
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
          Active users ({allUsers.length})
        </h2>

        {allUsers.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            No active users yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {allUsers.map((u) => (
              <div key={u.id} style={cardStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {u.name ?? "(no name)"}
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {u.email}
                  </p>
                </div>
                <select
                  value={u.role}
                  disabled={loadingId === u.id}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  style={{
                    padding: "0.375rem 0.625rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--cream-border)",
                    background: "var(--surface-base)",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="pending">Suspend (pending)</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
