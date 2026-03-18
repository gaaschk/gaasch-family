import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";
import { presignGet, getObjectBuffer } from "@/src/lib/s3";

// ---------- GET: list documents for a tree (optionally filtered by personId) ----------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const personId = req.nextUrl.searchParams.get("personId") ?? undefined;

  const docs = await prisma.document.findMany({
    where: { treeId: auth.tree.id, ...(personId ? { personId } : {}) },
    orderBy: { createdAt: "asc" },
  });

  const withUrls = await Promise.all(
    docs.map(async (d) => ({
      ...d,
      url: await presignGet(d.s3Key),
    })),
  );

  return NextResponse.json(withUrls);
}

// ---------- POST: confirm upload + create Document record ----------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { s3Key, filename, mimeType, sizeBytes, personId, category, caption } = body as {
    s3Key?: string;
    filename?: string;
    mimeType?: string;
    sizeBytes?: number;
    personId?: string | null;
    category?: string;
    caption?: string | null;
  };

  if (!s3Key || typeof s3Key !== "string") return apiError("MISSING_S3_KEY", "s3Key is required");
  if (!filename) return apiError("MISSING_FILENAME", "filename is required");
  if (!mimeType) return apiError("MISSING_MIME", "mimeType is required");
  if (!sizeBytes || sizeBytes <= 0) return apiError("INVALID_SIZE", "sizeBytes must be > 0");

  // Cross-tenant guard: ensure the key belongs to this tree
  if (!s3Key.startsWith(`trees/${auth.tree.id}/`)) {
    return apiError("FORBIDDEN", "s3Key does not belong to this tree", undefined, 403);
  }

  // Validate personId belongs to this tree if provided
  if (personId) {
    const exists = await prisma.person.findFirst({
      where: { id: personId, treeId: auth.tree.id },
      select: { id: true },
    });
    if (!exists) return apiError("PERSON_NOT_FOUND", "Person not found in this tree", undefined, 404);
  }

  const docCategory = category ?? (mimeType.startsWith("image/") ? "photo" : "other");

  const doc = await prisma.document.create({
    data: {
      treeId: auth.tree.id,
      personId: personId ?? null,
      s3Key,
      filename,
      mimeType,
      sizeBytes,
      category: docCategory,
      caption: caption ?? null,
      uploadedById: auth.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      treeId: auth.tree.id,
      userId: auth.userId,
      personId: personId ?? null,
      action: "create",
      entityType: "document",
      entityId: doc.id,
      newJson: JSON.stringify({ filename, mimeType, sizeBytes, category: docCategory }),
    },
  });

  // Portrait detection — async, best-effort; only for images attached to a person
  if (doc.mimeType.startsWith("image/") && doc.personId) {
    detectPortrait(doc.id, doc.s3Key, doc.personId, auth.tree.id).catch(() => {
      // non-fatal — portrait detection is best-effort
    });
  }

  const url = await presignGet(doc.s3Key);
  return NextResponse.json({ ...doc, url }, { status: 201 });
}

// ---- Portrait detection (runs after response is sent) ----
async function detectPortrait(
  docId: string,
  s3Key: string,
  personId: string,
  treeId: string,
) {
  // Fetch API key from tree settings
  const apiKeySetting = await prisma.setting.findUnique({
    where: { treeId_key: { treeId, key: "anthropic_api_key" } },
  });
  if (!apiKeySetting?.value) return; // silently skip — no key configured

  let imageBuffer: Buffer;
  try {
    imageBuffer = await getObjectBuffer(s3Key);
  } catch {
    return;
  }

  const base64 = imageBuffer.toString("base64");
  const mimeMatch = s3Key.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const mediaType = mimeMatch
    ? `image/${mimeMatch[1].replace("jpg", "jpeg")}`
    : "image/jpeg";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKeySetting.value,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Does this image show a clear photograph of a single person suitable as a profile portrait? Reply with only a decimal number from 0.0 (not a portrait) to 1.0 (perfect portrait photo).",
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return;

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const score = parseFloat(text.match(/[\d.]+/)?.[0] ?? "0");
  if (isNaN(score)) return;

  const isPortrait = score >= 0.6;

  await prisma.document.update({
    where: { id: docId },
    data: { portraitScore: score, isPortrait },
  });

  if (!isPortrait) return;

  // If this person has no portrait, or this scores higher than current portrait
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { portrait: { select: { portraitScore: true } } },
  });
  if (!person) return;

  const currentScore = person.portrait?.portraitScore ?? -1;
  if (score > currentScore) {
    await prisma.person.update({
      where: { id: personId },
      data: { portraitId: docId },
    });
  }
}
