import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccessOrToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type Params = { treeId: string; personId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, personId } = await params;
  const auth = await requireTreeAccessOrToken(req, treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const [person, apiKeySetting, modelSetting] = await Promise.all([
    prisma.person.findFirst({
      where: { id: personId, treeId: auth.tree.id },
      include: {
        childInFamilies: {
          include: {
            family: {
              include: {
                husband: { select: { firstName: true, lastName: true } },
                wife: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        husbandInFamilies: {
          include: {
            wife: { select: { firstName: true, lastName: true } },
            children: {
              include: {
                person: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        wifeInFamilies: {
          include: {
            husband: { select: { firstName: true, lastName: true } },
            children: {
              include: {
                person: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
    prisma.setting.findUnique({
      where: { treeId_key: { treeId: auth.tree.id, key: "anthropic_api_key" } },
    }),
    prisma.setting.findUnique({
      where: { treeId_key: { treeId: auth.tree.id, key: "anthropic_model" } },
    }),
  ]);

  if (!person) return apiError("NOT_FOUND", "Person not found", undefined, 404);
  if (!apiKeySetting?.value) {
    return apiError(
      "NO_API_KEY",
      "Anthropic API key not configured. Set it in tree settings.",
      undefined,
      422,
    );
  }

  const model = modelSetting?.value || "claude-haiku-4-5-20251001";
  const name =
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    "this person";

  // Build facts context
  const facts: string[] = [];
  if (person.gender)
    facts.push(
      `Gender: ${person.gender === "M" ? "Male" : person.gender === "F" ? "Female" : "Other"}`,
    );
  if (person.birthDate)
    facts.push(
      `Born: ${[person.birthDate, person.birthPlace].filter(Boolean).join(", ")}`,
    );
  if (person.deathDate)
    facts.push(
      `Died: ${[person.deathDate, person.deathPlace].filter(Boolean).join(", ")}`,
    );
  if (person.occupation) facts.push(`Occupation: ${person.occupation}`);
  if (person.notes) facts.push(`Notes: ${person.notes}`);

  const parents = person.childInFamilies.flatMap((fc) => {
    return [fc.family.husband, fc.family.wife]
      .filter(Boolean)
      .map((p) => [p?.firstName, p?.lastName].filter(Boolean).join(" "));
  });
  if (parents.length) facts.push(`Parents: ${parents.join(", ")}`);

  const spouses = [
    ...person.husbandInFamilies.map((f) => f.wife),
    ...person.wifeInFamilies.map((f) => f.husband),
  ]
    .filter(Boolean)
    .map((p) => [p?.firstName, p?.lastName].filter(Boolean).join(" "));
  if (spouses.length) facts.push(`Spouse(s): ${spouses.join(", ")}`);

  const children = [
    ...person.husbandInFamilies,
    ...person.wifeInFamilies,
  ].flatMap((f) =>
    f.children.map((c) =>
      [c.person.firstName, c.person.lastName].filter(Boolean).join(" "),
    ),
  );
  if (children.length) facts.push(`Children: ${children.join(", ")}`);

  const prompt = `You are writing a biographical narrative for a family history record.

Write a 3-5 paragraph biographical narrative about ${name} based on these facts:

${facts.map((f) => `- ${f}`).join("\n")}

Guidelines:
- Write in the third person, past tense
- Be warm and humanizing — this is for a family history, not a Wikipedia article
- Acknowledge gaps in the record gracefully ("records suggest…", "it is believed…")
- Do not invent facts not in the list
- Format as flowing HTML paragraphs using only <p> tags
- Do not include a title or heading`;

  // Stream from Anthropic API
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
      messages: [{ role: "user", content: prompt }],
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

  // Stream the response back and accumulate full text
  const encoder = new TextEncoder();
  let accumulated = "";

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
                accumulated += text;
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

      // Save the full narrative to the DB
      await prisma.person.update({
        where: { id: personId },
        data: { narrative: accumulated },
      });

      await prisma.auditLog.create({
        data: {
          treeId: auth.tree.id,
          userId: auth.userId,
          personId,
          action: "generate-narrative",
          entityType: "person",
          entityId: personId,
        },
      });

      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
