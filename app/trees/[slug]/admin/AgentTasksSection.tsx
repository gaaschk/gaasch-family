"use client";

import { useCallback, useEffect, useState } from "react";

type AgentTask = {
  id: string;
  taskType: string;
  status: string;
  resultJson: string | null;
  error: string | null;
  createdAt: string;
};

type Proposal = {
  id: string;
  source: string;
  externalId: string;
  proposedData: string;
  status: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--amber)",
  running: "var(--forest)",
  completed: "var(--color-success)",
  failed: "var(--color-error)",
};

const TASK_LABELS: Record<string, string> = {
  geocode: "Geocode places",
  "narrative-batch": "Generate narratives (bulk)",
  research: "Research person on WikiTree",
};

export default function AgentTasksSection({ treeId }: { treeId: string }) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [enqueueing, setEnqueueing] = useState<string | null>(null);
  const [enqueueError, setEnqueueError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const sLabel: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "var(--brown-muted)",
    marginBottom: "1rem",
  };

  const load = useCallback(async () => {
    const [tasksRes, propsRes] = await Promise.all([
      fetch(`/api/trees/${treeId}/agent-tasks?limit=10`),
      fetch(`/api/trees/${treeId}/proposed-people?status=pending`),
    ]);
    if (tasksRes.ok) setTasks(await tasksRes.json());
    if (propsRes.ok) setProposals(await propsRes.json());
  }, [treeId]);

  useEffect(() => {
    load();
    // Poll while any job is running
    const interval = setInterval(() => {
      load();
    }, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function enqueue(taskType: string) {
    setEnqueueing(taskType);
    setEnqueueError(null);
    try {
      const res = await fetch(`/api/trees/${treeId}/agent-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType, input: {} }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnqueueError(data.error ?? "Failed to start task.");
      } else {
        setTasks((prev) => [data, ...prev]);
      }
    } catch {
      setEnqueueError("Something went wrong.");
    } finally {
      setEnqueueing(null);
    }
  }

  async function reviewProposal(id: string, action: "accept" | "reject") {
    setReviewingId(id);
    try {
      await fetch(`/api/trees/${treeId}/proposed-people/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setReviewingId(null);
    }
  }

  function resultSummary(task: AgentTask): string {
    if (task.status === "failed") return task.error ?? "Unknown error";
    if (!task.resultJson) return "—";
    try {
      const r = JSON.parse(task.resultJson);
      if (task.taskType === "geocode")
        return `${r.geocoded}/${r.total} places geocoded`;
      if (task.taskType === "narrative-batch")
        return `${r.succeeded} narratives generated, ${r.failed} failed`;
      if (task.taskType === "research") return r.message ?? JSON.stringify(r);
    } catch {
      return task.resultJson;
    }
    return "—";
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Trigger buttons */}
      <div>
        <h2 style={sLabel}>Background tasks</h2>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            marginBottom: "1rem",
          }}
        >
          Run AI and data enrichment tasks across the whole tree. Jobs process
          in the background — you can leave this page and come back.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {(["geocode", "narrative-batch"] as const).map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => enqueue(type)}
              disabled={enqueueing === type}
              style={{
                padding: "0.5rem 1.1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--cream-border)",
                background:
                  enqueueing === type
                    ? "var(--surface-base)"
                    : "var(--surface-raised)",
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: enqueueing === type ? "not-allowed" : "pointer",
                opacity: enqueueing === type ? 0.6 : 1,
              }}
            >
              {enqueueing === type ? "Queuing…" : TASK_LABELS[type]}
            </button>
          ))}
        </div>
        {enqueueError && (
          <p
            style={{
              color: "var(--color-error)",
              fontSize: "0.8125rem",
              marginTop: "0.5rem",
            }}
          >
            {enqueueError}
          </p>
        )}
      </div>

      {/* Recent tasks */}
      {tasks.length > 0 && (
        <div>
          <h2 style={{ ...sLabel, marginBottom: "0.75rem" }}>Recent tasks</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
            }}
          >
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--cream-border)",
                  background: "var(--surface-raised)",
                  fontSize: "0.875rem",
                }}
              >
                <span
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background:
                      STATUS_COLOR[task.status] ?? "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {TASK_LABELS[task.taskType] ?? task.taskType}
                </span>
                <span style={{ color: "var(--text-muted)", flex: 1 }}>
                  {resultSummary(task)}
                </span>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposed people review */}
      {proposals.length > 0 && (
        <div>
          <h2 style={sLabel}>
            Proposed people ({proposals.length} pending review)
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              marginBottom: "1rem",
            }}
          >
            The research agent found these potential new family members. Accept
            to add them to the tree, or reject to permanently dismiss.
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {proposals.map((p) => {
              const d = (() => {
                try {
                  return JSON.parse(p.proposedData);
                } catch {
                  return {};
                }
              })();
              const name =
                [d.firstName, d.lastName].filter(Boolean).join(" ") ||
                "(unnamed)";
              const lifespan = [d.birthDate, d.deathDate]
                .filter(Boolean)
                .join(" – ");
              return (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--cream-border)",
                    background: "var(--surface-raised)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        fontSize: "0.9375rem",
                      }}
                    >
                      {name}
                    </p>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {[lifespan, d.birthPlace, d.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginTop: "0.1rem",
                      }}
                    >
                      Source: {p.source} #{p.externalId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => reviewProposal(p.id, "accept")}
                    disabled={reviewingId === p.id}
                    style={{
                      padding: "0.35rem 0.875rem",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: "var(--forest)",
                      color: "#fff",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: reviewingId === p.id ? "not-allowed" : "pointer",
                      opacity: reviewingId === p.id ? 0.5 : 1,
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewProposal(p.id, "reject")}
                    disabled={reviewingId === p.id}
                    style={{
                      padding: "0.35rem 0.875rem",
                      borderRadius: "var(--radius-md)",
                      border:
                        "1px solid color-mix(in srgb, var(--color-error) 30%, transparent)",
                      background: "transparent",
                      color: "var(--color-error)",
                      fontSize: "0.8125rem",
                      cursor: reviewingId === p.id ? "not-allowed" : "pointer",
                      opacity: reviewingId === p.id ? 0.5 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
