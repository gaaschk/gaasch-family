import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { requireTreeAccess, apiError } from "@/src/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "admin");
  if (auth instanceof NextResponse) return auth;

  const settings = await prisma.setting.findMany({
    where: { treeId: auth.tree.id },
  });

  // Never return the raw API key — return a masked version
  return NextResponse.json(
    settings.map((s) => ({
      key: s.key,
      value: s.key === "anthropic_api_key" && s.value
        ? `sk-…${s.value.slice(-4)}`
        : s.value,
    })),
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "admin");
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_BODY", "Invalid request body");
  }

  const { key, value } = body as { key?: string; value?: string };
  const allowed = ["anthropic_api_key", "anthropic_model", "api_token"];

  if (!key || !allowed.includes(key)) {
    return apiError("INVALID_KEY", `Key must be one of: ${allowed.join(", ")}`);
  }
  if (value === undefined || value === null) {
    return apiError("MISSING_VALUE", "Value is required");
  }

  const setting = await prisma.setting.upsert({
    where: { treeId_key: { treeId: auth.tree.id, key } },
    update: { value },
    create: { treeId: auth.tree.id, key, value },
  });

  return NextResponse.json({
    key: setting.key,
    value: key === "anthropic_api_key" ? `sk-…${value.slice(-4)}` : value,
  });
}
