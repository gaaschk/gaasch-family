import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { BUCKET, presignPut } from "@/src/lib/s3";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  if (!BUCKET) {
    return apiError(
      "S3_NOT_CONFIGURED",
      "Document storage is not configured on this server",
      undefined,
      503,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { filename, mimeType, sizeBytes } = body as {
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
  };

  if (!filename || typeof filename !== "string") {
    return apiError("MISSING_FILENAME", "filename is required");
  }
  if (!mimeType || !ALLOWED_MIME.has(mimeType)) {
    return apiError(
      "INVALID_MIME",
      `Allowed types: ${[...ALLOWED_MIME].join(", ")}`,
    );
  }
  if (
    !sizeBytes ||
    typeof sizeBytes !== "number" ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_BYTES
  ) {
    return apiError(
      "INVALID_SIZE",
      `File must be between 1 byte and ${MAX_BYTES / 1024 / 1024} MB`,
    );
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const s3Key = `trees/${auth.tree.id}/documents/${randomUUID()}.${ext}`;

  const uploadUrl = await presignPut(s3Key, mimeType, sizeBytes);

  return NextResponse.json({ uploadUrl, s3Key });
}
