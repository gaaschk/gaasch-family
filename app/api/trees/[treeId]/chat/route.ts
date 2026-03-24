import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type Params = { treeId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const messages: { role: string; content: string }[] = body.messages ?? [];

  const [apiKeySetting, modelSetting] = await Promise.all([
    prisma.setting.findUnique({
      where: { treeId_key: { treeId: auth.tree.id, key: "anthropic_api_key" } },
    }),
    prisma.setting.findUnique({
      where: { treeId_key: { treeId: auth.tree.id, key: "anthropic_model" } },
    }),
  ]);

  if (!apiKeySetting?.value) {
    return apiError(
      "NO_API_KEY",
      "Anthropic API key not configured. Ask the tree owner to add one in Settings.",
      undefined,
      422,
    );
  }

  const model = modelSetting?.value || "claude-haiku-4-5-20251001";

  const systemPrompt = `You are a helpful genealogy assistant for the ${auth.tree.name} family tree. Answer questions about the people in this family, their history, relationships, dates, places, and historical context. Be warm, conversational, and accurate. Do not invent facts.`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKeySetting.value,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return apiError(
      "ANTHROPIC_ERROR",
      "Anthropic API error",
      errText,
      anthropicRes.status,
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        controller.error(new Error("No response body from Anthropic"));
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.type === "text_delta"
              ) {
                const text = parsed.delta.text ?? "";
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
