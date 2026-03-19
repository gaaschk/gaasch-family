"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Path = "choose" | "create-step1" | "create-step2" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const [path, setPath] = useState<Path>("choose");
  const [treeName, setTreeName] = useState("");
  const [treeId, setTreeId] = useState<string | null>(null);
  const [treeSlug, setTreeSlug] = useState<string | null>(null);
  const [gedcomFile, setGedcomFile] = useState<File | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  // Check if already onboarded (server redirect handles this but double-check client-side)
  useEffect(() => {
    fetch("/api/trees")
      .then((r) => r.json())
      .then((data) => {
        if ((data.owned?.length ?? 0) + (data.member?.length ?? 0) > 0) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  async function handleCreateTree(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: treeName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create tree. Try a different name.");
      } else {
        setTreeId(data.id);
        setTreeSlug(data.slug);
        setPath("create-step2");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGedcomImport() {
    if (!gedcomFile || !treeId) return;
    setError(null);
    setLoading(true);
    setImportProgress("Importing your family data…");
    try {
      const formData = new FormData();
      formData.append("file", gedcomFile);
      const res = await fetch(`/api/trees/${treeId}/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ??
            "Import failed. You can import from your tree settings later.",
        );
        setImportProgress(null);
        setLoading(false);
        // Still redirect — tree exists
        setTimeout(() => router.push(`/trees/${treeSlug}`), 2500);
      } else {
        router.push(`/trees/${treeSlug}`);
      }
    } catch {
      setError("Import failed. You can import from your tree settings later.");
      setImportProgress(null);
      setLoading(false);
      setTimeout(() => router.push(`/trees/${treeSlug}`), 2500);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Extract token from URL if full URL pasted
      let token = inviteCode.trim();
      const urlMatch = token.match(/\/invite\/([a-z0-9]+)/i);
      if (urlMatch) token = urlMatch[1];

      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setError("This invite was sent to a different email address.");
        } else if (res.status === 410) {
          setError("This invite has expired or already been used.");
        } else {
          setError("That code is invalid or has expired.");
        }
      } else {
        router.push(`/trees/${data.treeSlug}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = (active: boolean) => ({
    flex: 1,
    minWidth: 0,
    padding: "2rem 1.5rem",
    borderRadius: "var(--radius-xl, 16px)",
    border: active
      ? "2px solid var(--forest)"
      : "1px solid var(--cream-border)",
    background: active ? "#EAF0EC" : "var(--surface-raised)",
    cursor: "pointer",
    textAlign: "center" as const,
    transition: "all 150ms ease-out",
  });

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "var(--surface-base)" }}
    >
      <div className="w-full" style={{ maxWidth: "560px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <span
            className="font-display"
            style={{
              fontSize: "1.5rem",
              fontWeight: 400,
              color: "var(--brown-text)",
              fontStyle: "italic",
            }}
          >
            Heirloom
          </span>
        </div>

        {path === "choose" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
              <h1
                className="font-display"
                style={{
                  fontSize: "2.25rem",
                  fontWeight: 400,
                  color: "var(--brown-text)",
                  marginBottom: "0.75rem",
                }}
              >
                Your ancestors are waiting.
              </h1>
              <p
                className="font-narrative"
                style={{
                  fontSize: "1.125rem",
                  color: "var(--brown-muted)",
                  fontStyle: "italic",
                }}
              >
                Let&apos;s build your tree.
              </p>
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button
                type="button"
                style={cardStyle(false)}
                onClick={() => setPath("create-step1")}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--forest)";
                  (e.currentTarget as HTMLElement).style.background = "#EAF0EC";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--cream-border)";
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--surface-raised)";
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
                  🌳
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 500,
                    color: "var(--brown-text)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Build your tree
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--brown-muted)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  Start fresh or import a GEDCOM file
                </p>
              </button>

              <button
                type="button"
                style={cardStyle(false)}
                onClick={() => setPath("join")}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--forest)";
                  (e.currentTarget as HTMLElement).style.background = "#EAF0EC";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--cream-border)";
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--surface-raised)";
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
                  📨
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 500,
                    color: "var(--brown-text)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Join a family tree
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--brown-muted)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  Someone sent you a link — enter the code
                </p>
              </button>
            </div>
          </>
        )}

        {path === "create-step1" && (
          <>
            <div style={{ marginBottom: "2rem" }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.12em",
                  color: "var(--brown-muted)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  marginBottom: "1rem",
                }}
              >
                Step 1 of 2
              </p>
              <h1
                className="font-display"
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 400,
                  color: "var(--brown-text)",
                  marginBottom: "0.5rem",
                }}
              >
                Name your tree
              </h1>
            </div>

            <form
              onSubmit={handleCreateTree}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                }}
              >
                <label
                  htmlFor="treeName"
                  className="font-ui"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  Tree name
                </label>
                <input
                  id="treeName"
                  type="text"
                  required
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  placeholder="e.g. The Gaasch Family"
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
              </div>
              <button
                type="submit"
                disabled={loading || !treeName.trim()}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "var(--radius-md)",
                  background:
                    loading || !treeName.trim()
                      ? "var(--brown-light)"
                      : "var(--forest)",
                  color: "#fff",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: "1rem",
                  border: "none",
                  cursor:
                    loading || !treeName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creating…" : "Continue →"}
              </button>
              <button
                type="button"
                onClick={() => setPath("choose")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--brown-muted)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-ui)",
                  padding: 0,
                }}
              >
                ← Back
              </button>
            </form>
          </>
        )}

        {path === "create-step2" && (
          <>
            <div style={{ marginBottom: "2rem" }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.12em",
                  color: "var(--brown-muted)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  marginBottom: "1rem",
                }}
              >
                Step 2 of 2
              </p>
              <h1
                className="font-display"
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 400,
                  color: "var(--brown-text)",
                  marginBottom: "0.5rem",
                }}
              >
                Import your family data
              </h1>
              <p
                className="font-narrative"
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--brown-muted)",
                  fontStyle: "italic",
                }}
              >
                Have a GEDCOM file? Drop it here to import your tree.
              </p>
            </div>

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
                  marginBottom: "1rem",
                }}
              >
                {error}
              </p>
            )}

            <section
              aria-label="GEDCOM file drop zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) setGedcomFile(file);
              }}
              style={{
                border: `2px dashed ${gedcomFile ? "var(--forest)" : "var(--cream-border)"}`,
                borderRadius: "var(--radius-lg, 10px)",
                padding: "2.5rem",
                textAlign: "center",
                marginBottom: "1.5rem",
                background: gedcomFile ? "#EAF0EC" : "transparent",
                transition: "all 150ms ease-out",
              }}
            >
              {gedcomFile ? (
                <div>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                    ✓
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "var(--forest)",
                      fontWeight: 500,
                    }}
                  >
                    {gedcomFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setGedcomFile(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--brown-muted)",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                      fontFamily: "var(--font-ui)",
                      marginTop: "0.5rem",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "var(--brown-muted)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Drop your .ged file here, or
                  </p>
                  <label
                    style={{
                      color: "var(--forest)",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontFamily: "var(--font-ui)",
                      fontWeight: 500,
                    }}
                  >
                    browse files
                    <input
                      type="file"
                      accept=".ged,.gedcom"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setGedcomFile(f);
                      }}
                    />
                  </label>
                </div>
              )}
            </section>

            {importProgress && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--forest)",
                  fontFamily: "var(--font-ui)",
                  marginBottom: "1rem",
                  textAlign: "center",
                }}
              >
                {importProgress}
              </p>
            )}

            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--brown-muted)",
                fontFamily: "var(--font-narrative)",
                fontStyle: "italic",
                marginBottom: "1.5rem",
              }}
            >
              GEDCOM is the standard export from Ancestry, FamilySearch, and
              most genealogy software.
            </p>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => router.push(`/trees/${treeSlug}`)}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--cream-border)",
                  background: "transparent",
                  color: "var(--brown-text)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                }}
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleGedcomImport}
                disabled={!gedcomFile || loading}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  background:
                    !gedcomFile || loading
                      ? "var(--brown-light)"
                      : "var(--forest)",
                  color: "#fff",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  border: "none",
                  cursor: !gedcomFile || loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Importing…" : "Import & Finish"}
              </button>
            </div>
          </>
        )}

        {path === "join" && (
          <>
            <div style={{ marginBottom: "2rem" }}>
              <h1
                className="font-display"
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 400,
                  color: "var(--brown-text)",
                  marginBottom: "0.5rem",
                }}
              >
                Enter your invite code
              </h1>
              <p
                className="font-narrative"
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--brown-muted)",
                  fontStyle: "italic",
                }}
              >
                Paste the invite link or code from your email.
              </p>
            </div>

            <form
              onSubmit={handleJoin}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
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
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                }}
              >
                <label
                  htmlFor="inviteCode"
                  className="font-ui"
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  Invite code or link
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Paste your invite link here"
                  style={{
                    padding: "0.625rem 0.875rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--cream-border)",
                    background: "var(--surface-raised)",
                    color: "var(--text-primary)",
                    fontSize: "1rem",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--forest)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--cream-border)";
                  }}
                />
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--brown-muted)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  Don&apos;t have a code? Ask the tree admin to send you an
                  invite.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "var(--radius-md)",
                  background:
                    loading || !inviteCode.trim()
                      ? "var(--brown-light)"
                      : "var(--forest)",
                  color: "#fff",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 600,
                  fontSize: "1rem",
                  border: "none",
                  cursor:
                    loading || !inviteCode.trim() ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Joining…" : "Join Tree"}
              </button>
              <button
                type="button"
                onClick={() => setPath("choose")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--brown-muted)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-ui)",
                  padding: 0,
                }}
              >
                ← Back
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
