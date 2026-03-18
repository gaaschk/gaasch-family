"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

type Doc = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  caption: string | null;
  isPortrait: boolean;
  url: string;
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_MB = 20;

export default function DocumentsSection({
  treeId,
  personId,
  initialDocs,
  canEdit,
}: {
  treeId: string;
  personId: string;
  initialDocs: Doc[];
  canEdit: boolean;
}) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const file = files[0];

      if (!ALLOWED.includes(file.type)) {
        setUploadError("Unsupported file type. Use JPEG, PNG, WebP, or PDF.");
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setUploadError(`File too large. Maximum ${MAX_MB} MB.`);
        return;
      }

      setUploading(true);
      setUploadError(null);

      try {
        // Step 1: get presigned URL
        const presignRes = await fetch(`/api/trees/${treeId}/documents/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        });
        if (!presignRes.ok) {
          const d = await presignRes.json().catch(() => ({}));
          throw new Error(d.error ?? "Could not get upload URL.");
        }
        const { uploadUrl, s3Key } = await presignRes.json();

        // Step 2: PUT directly to S3
        const s3Res = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!s3Res.ok) throw new Error("Upload to storage failed.");

        // Step 3: confirm with server
        const confirmRes = await fetch(`/api/trees/${treeId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            s3Key,
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            personId,
            category: file.type.startsWith("image/") ? "photo" : "other",
          }),
        });
        if (!confirmRes.ok) {
          const d = await confirmRes.json().catch(() => ({}));
          throw new Error(d.error ?? "Could not save document.");
        }
        const newDoc: Doc = await confirmRes.json();
        setDocs((prev) => [...prev, newDoc]);
      } catch (err: unknown) {
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [treeId, personId],
  );

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document permanently?")) return;
    setDeletingId(docId);
    try {
      await fetch(`/api/trees/${treeId}/documents/${docId}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } finally {
      setDeletingId(null);
    }
  }

  const photos = docs.filter((d) => d.mimeType.startsWith("image/"));
  const files = docs.filter((d) => !d.mimeType.startsWith("image/"));

  return (
    <section>
      {/* Photo grid */}
      {photos.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {photos.map((doc) => (
            <div
              key={doc.id}
              style={{
                position: "relative",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: doc.isPortrait
                  ? "2px solid var(--forest)"
                  : "1px solid var(--cream-border)",
                background: "var(--surface-raised)",
                aspectRatio: "1",
              }}
            >
              <Image
                src={doc.url}
                alt={doc.caption ?? doc.filename}
                fill
                style={{ objectFit: "cover" }}
                sizes="160px"
                unoptimized
              />
              {doc.isPortrait && (
                <span
                  style={{
                    position: "absolute",
                    top: "0.3rem",
                    left: "0.3rem",
                    background: "var(--forest)",
                    color: "#fff",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  PORTRAIT
                </span>
              )}
              {canEdit && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  title="Delete"
                  style={{
                    position: "absolute",
                    top: "0.3rem",
                    right: "0.3rem",
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "50%",
                    border: "none",
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    fontSize: "0.875rem",
                    lineHeight: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Non-image files */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "1rem" }}>
          {files.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--cream-border)",
                background: "var(--surface-raised)",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: "1rem" }}>📄</span>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, color: "var(--text-link)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {doc.caption || doc.filename}
              </a>
              {canEdit && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--color-error)",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    padding: "0.125rem 0.25rem",
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canEdit && (
        <div>
          <label
            style={{
              display: "inline-block",
              padding: "0.4rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--cream-border)",
              background: uploading ? "var(--surface-base)" : "var(--surface-raised)",
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "Uploading…" : "+ Add photo or document"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
          {uploadError && (
            <p style={{ color: "var(--color-error)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
              {uploadError}
            </p>
          )}
        </div>
      )}

      {docs.length === 0 && !canEdit && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No documents yet.</p>
      )}
    </section>
  );
}
