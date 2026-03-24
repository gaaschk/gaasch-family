import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type Params = { treeId: string };

type PersonInfo = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  occupation: string | null;
  narrative: string | null;
  gender: string | null;
};

// Walk ancestor chain from `personId` and find path to `targetId`.
// Returns the chain from `personId` up to `targetId` if found, or null.
async function findAncestorPath(
  personId: string,
  targetId: string,
  treeId: string,
  maxDepth: number,
): Promise<PersonInfo[] | null> {
  if (maxDepth < 0) return null;

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      birthPlace: true,
      deathDate: true,
      deathPlace: true,
      occupation: true,
      narrative: true,
      gender: true,
    },
  });

  if (!person) return null;

  if (person.id === targetId) return [person];

  const familyChild = await prisma.familyChild.findFirst({
    where: { personId: person.id },
    include: { family: true },
  });

  if (!familyChild?.family) return null;

  const { husbandId, wifeId } = familyChild.family;

  for (const parentId of [husbandId, wifeId]) {
    if (!parentId) continue;
    const subPath = await findAncestorPath(
      parentId,
      targetId,
      treeId,
      maxDepth - 1,
    );
    if (subPath) return [person, ...subPath];
  }

  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "viewer");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { fromPersonId, toPersonId } = body as {
    fromPersonId?: string;
    toPersonId?: string;
  };

  if (!fromPersonId || !toPersonId) {
    return apiError(
      "INVALID_INPUT",
      "fromPersonId and toPersonId are required",
      undefined,
      400,
    );
  }

  if (fromPersonId === toPersonId) {
    return apiError(
      "INVALID_INPUT",
      "fromPersonId and toPersonId must be different people",
      undefined,
      400,
    );
  }

  // Verify both people exist in this tree
  const [fromPerson, toPerson, apiKeySetting, modelSetting] = await Promise.all(
    [
      prisma.person.findFirst({
        where: { id: fromPersonId, treeId: auth.tree.id },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.person.findFirst({
        where: { id: toPersonId, treeId: auth.tree.id },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.setting.findUnique({
        where: {
          treeId_key: { treeId: auth.tree.id, key: "anthropic_api_key" },
        },
      }),
      prisma.setting.findUnique({
        where: { treeId_key: { treeId: auth.tree.id, key: "anthropic_model" } },
      }),
    ],
  );

  if (!fromPerson) {
    return apiError(
      "NOT_FOUND",
      "Starting person not found in this tree",
      undefined,
      404,
    );
  }
  if (!toPerson) {
    return apiError(
      "NOT_FOUND",
      "Target person not found in this tree",
      undefined,
      404,
    );
  }
  if (!apiKeySetting?.value) {
    return apiError(
      "NO_API_KEY",
      "Anthropic API key not configured. Ask the tree owner to add one in Settings.",
      undefined,
      422,
    );
  }

  // Find path from `from` up to `to` through ancestors
  const chain = await findAncestorPath(
    fromPersonId,
    toPersonId,
    auth.tree.id,
    6,
  );
  if (!chain) {
    return apiError(
      "NO_PATH",
      "No ancestor path found between these two people (max 6 generations).",
      undefined,
      422,
    );
  }

  const ALLOWED_MODELS = new Set([
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "claude-opus-4-6",
  ]);
  const requestedModel = modelSetting?.value ?? "";
  const model = ALLOWED_MODELS.has(requestedModel)
    ? requestedModel
    : "claude-haiku-4-5-20251001";

  function personName(p: {
    firstName: string | null;
    lastName: string | null;
  }) {
    return [p.firstName, p.lastName].filter(Boolean).join(" ") || "Unknown";
  }

  function personSummary(p: PersonInfo, gen: number) {
    const parts: string[] = [`Generation ${gen + 1}: ${personName(p)}`];
    if (p.birthDate || p.birthPlace) {
      parts.push(
        `Born: ${[p.birthDate, p.birthPlace].filter(Boolean).join(", ")}`,
      );
    }
    if (p.deathDate || p.deathPlace) {
      parts.push(
        `Died: ${[p.deathDate, p.deathPlace].filter(Boolean).join(", ")}`,
      );
    }
    if (p.occupation) parts.push(`Occupation: ${p.occupation}`);
    if (p.narrative) {
      const plain = p.narrative
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      parts.push(
        `Known narrative: ${plain.slice(0, 300)}${plain.length > 300 ? "…" : ""}`,
      );
    }
    return parts.join("\n");
  }

  const fromName = personName(fromPerson);
  const toName = personName(toPerson);

  const generationSummaries = chain
    .map((p, i) => personSummary(p, i))
    .join("\n\n");

  const prompt = `You are writing a narrative for a family history record.

Trace the lineage from ${fromName} to ${toName} through the following generations:

${generationSummaries}

Write a flowing narrative that connects these generations, 3-5 sentences per generation. Start with ${fromName} and work your way to ${toName}. Acknowledge gaps in the historical record gracefully. Format as HTML <p> tags only — one <p> per generation. Use a warm, humanizing family history tone. Do not invent facts not provided above.`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKeySetting.value,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    await anthropicRes.text(); // consume body, don't expose to client
    return apiError(
      "ANTHROPIC_ERROR",
      "Anthropic API error",
      undefined,
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
