/**
 * Agent worker — processes AgentTask jobs queued via BullMQ.
 *
 * Task types:
 *  - geocode         Geocode birthPlace/deathPlace for people missing lat/lng
 *  - narrative-batch Generate AI narratives for a list of people
 *  - research        Propose new relatives via WikiTree name search
 */

import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { AgentJobData } from "../lib/queue";

const prisma = new PrismaClient();

function makeConnectionOpts() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port || "6379"),
      username: u.username || undefined,
      password: u.password || undefined,
      tls: u.protocol === "rediss:" ? {} : undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

const connectionOpts = makeConnectionOpts();

// ─── Geocode ──────────────────────────────────────────────────────
type GeocodeInput = { personIds?: string[] }; // omit = all in tree

async function geocodePlace(place: string): Promise<{ lat: number; lng: number } | null> {
  const encoded = encodeURIComponent(place);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "richmond-family-history/1.0 (family-history-app)" },
  });
  if (!res.ok) return null;
  const data: Array<{ lat: string; lon: string }> = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function runGeocode(agentTaskId: string, treeId: string, input: GeocodeInput) {
  const where = {
    treeId,
    ...(input.personIds?.length ? { id: { in: input.personIds } } : {}),
  };

  const people = await prisma.person.findMany({
    where: {
      ...where,
      OR: [
        { birthPlace: { not: null }, birthLat: null },
        { deathPlace: { not: null }, deathLat: null },
      ],
    },
    select: { id: true, birthPlace: true, birthLat: true, deathPlace: true, deathLat: true },
  });

  let geocoded = 0;
  for (const person of people) {
    const updates: { birthLat?: number; birthLng?: number; deathLat?: number; deathLng?: number } = {};

    if (person.birthPlace && person.birthLat === null) {
      // Rate-limit Nominatim: 1 req/s
      await new Promise((r) => setTimeout(r, 1100));
      const coords = await geocodePlace(person.birthPlace).catch(() => null);
      if (coords) {
        updates.birthLat = coords.lat;
        updates.birthLng = coords.lng;
      }
    }

    if (person.deathPlace && person.deathLat === null) {
      await new Promise((r) => setTimeout(r, 1100));
      const coords = await geocodePlace(person.deathPlace).catch(() => null);
      if (coords) {
        updates.deathLat = coords.lat;
        updates.deathLng = coords.lng;
      }
    }

    if (Object.keys(updates).length) {
      await prisma.person.update({ where: { id: person.id }, data: updates });
      geocoded++;
    }
  }

  return { geocoded, total: people.length };
}

// ─── Narrative batch ──────────────────────────────────────────────
type NarrativeBatchInput = { personIds: string[] };

async function generateNarrativeForPerson(
  personId: string,
  treeId: string,
  apiKey: string,
  model: string,
): Promise<boolean> {
  const person = await prisma.person.findFirst({
    where: { id: personId, treeId },
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
          children: { include: { person: { select: { firstName: true, lastName: true } } } },
        },
      },
      wifeInFamilies: {
        include: {
          husband: { select: { firstName: true, lastName: true } },
          children: { include: { person: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });

  if (!person) return false;

  const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "this person";
  const facts: string[] = [];
  if (person.gender) facts.push(`Gender: ${person.gender === "M" ? "Male" : person.gender === "F" ? "Female" : "Other"}`);
  if (person.birthDate) facts.push(`Born: ${[person.birthDate, person.birthPlace].filter(Boolean).join(", ")}`);
  if (person.deathDate) facts.push(`Died: ${[person.deathDate, person.deathPlace].filter(Boolean).join(", ")}`);
  if (person.occupation) facts.push(`Occupation: ${person.occupation}`);
  if (person.notes) facts.push(`Notes: ${person.notes}`);

  const parents = person.childInFamilies.flatMap((fc) =>
    [fc.family.husband, fc.family.wife].filter(Boolean).map(
      (p) => [p!.firstName, p!.lastName].filter(Boolean).join(" "),
    ),
  );
  if (parents.length) facts.push(`Parents: ${parents.join(", ")}`);

  const spouses = [...person.husbandInFamilies.map((f) => f.wife), ...person.wifeInFamilies.map((f) => f.husband)]
    .filter(Boolean)
    .map((p) => [p!.firstName, p!.lastName].filter(Boolean).join(" "));
  if (spouses.length) facts.push(`Spouse(s): ${spouses.join(", ")}`);

  const children = [...person.husbandInFamilies, ...person.wifeInFamilies]
    .flatMap((f) => f.children.map((c) => [c.person.firstName, c.person.lastName].filter(Boolean).join(" ")));
  if (children.length) facts.push(`Children: ${children.join(", ")}`);

  if (!facts.length) return false;

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  const narrative: string = data?.content?.[0]?.text ?? "";
  if (!narrative) return false;

  await prisma.person.update({ where: { id: personId }, data: { narrative } });
  return true;
}

async function runNarrativeBatch(
  agentTaskId: string,
  treeId: string,
  input: NarrativeBatchInput,
) {
  const [apiKeySetting, modelSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { treeId_key: { treeId, key: "anthropic_api_key" } } }),
    prisma.setting.findUnique({ where: { treeId_key: { treeId, key: "anthropic_model" } } }),
  ]);

  if (!apiKeySetting?.value) {
    throw new Error("Anthropic API key not configured for this tree");
  }

  const model = modelSetting?.value ?? "claude-haiku-4-5-20251001";
  let succeeded = 0;
  let failed = 0;

  for (const personId of input.personIds) {
    // Small delay between requests to avoid rate limits
    if (succeeded + failed > 0) await new Promise((r) => setTimeout(r, 500));
    const ok = await generateNarrativeForPerson(personId, treeId, apiKeySetting.value, model).catch(() => false);
    if (ok) succeeded++;
    else failed++;
  }

  return { succeeded, failed, total: input.personIds.length };
}

// ─── Research ─────────────────────────────────────────────────────
type ResearchInput = { personId: string };

async function runResearch(agentTaskId: string, treeId: string, input: ResearchInput) {
  const person = await prisma.person.findFirst({
    where: { id: input.personId, treeId },
    select: { id: true, firstName: true, lastName: true, birthDate: true, birthPlace: true, gender: true },
  });

  if (!person) throw new Error("Person not found");

  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  if (!name) return { proposed: 0, message: "Person has no name to search" };

  // WikiTree API search by name
  const params = new URLSearchParams({
    action: "getPeople",
    q: name,
    limit: "5",
    format: "json",
    fields: "Id,Name,FirstName,LastNameAtBirth,BirthDate,BirthLocation,DeathDate,DeathLocation,Father,Mother,Spouses,Children",
  });

  const wtRes = await fetch(`https://api.wikitree.com/api/?${params}`, {
    headers: { "User-Agent": "richmond-family-history/1.0" },
  });

  if (!wtRes.ok) return { proposed: 0, message: "WikiTree lookup failed" };

  const wtData = await wtRes.json();
  const results: Array<{
    Id?: number;
    Name?: string;
    FirstName?: string;
    LastNameAtBirth?: string;
    BirthDate?: string;
    BirthLocation?: string;
    DeathDate?: string;
    DeathLocation?: string;
  }> = wtData?.[0]?.people ? Object.values(wtData[0].people) : [];

  let proposed = 0;
  for (const result of results.slice(0, 3)) {
    if (!result.Id) continue;
    const externalId = String(result.Id);

    // Skip if already in tree by name
    const alreadyExists = await prisma.person.findFirst({
      where: {
        treeId,
        firstName: result.FirstName ?? null,
        lastName: result.LastNameAtBirth ?? null,
      },
      select: { id: true },
    });
    if (alreadyExists) continue;

    await prisma.proposedPerson.upsert({
      where: { treeId_source_externalId: { treeId, source: "wikitree", externalId } },
      update: {},
      create: {
        treeId,
        agentTaskId,
        source: "wikitree",
        externalId,
        proposedData: JSON.stringify({
          firstName: result.FirstName,
          lastName: result.LastNameAtBirth,
          birthDate: result.BirthDate,
          birthPlace: result.BirthLocation,
          deathDate: result.DeathDate,
          deathPlace: result.DeathLocation,
          wikiTreeName: result.Name,
          note: `WikiTree search result for "${name}"`,
        }),
      },
    });
    proposed++;
  }

  return { proposed, message: `Found ${results.length} WikiTree results, proposed ${proposed} new people` };
}

// ─── Worker ───────────────────────────────────────────────────────
async function processJob(job: Job<AgentJobData>) {
  const { agentTaskId, treeId, taskType, inputJson } = job.data;
  const input = JSON.parse(inputJson);

  // Mark as running
  await prisma.agentTask.update({
    where: { id: agentTaskId },
    data: { status: "running" },
  });

  try {
    let result: Record<string, unknown>;

    switch (taskType) {
      case "geocode":
        result = await runGeocode(agentTaskId, treeId, input as GeocodeInput);
        break;
      case "narrative-batch":
        result = await runNarrativeBatch(agentTaskId, treeId, input as NarrativeBatchInput);
        break;
      case "research":
        result = await runResearch(agentTaskId, treeId, input as ResearchInput);
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    await prisma.agentTask.update({
      where: { id: agentTaskId },
      data: { status: "completed", resultJson: JSON.stringify(result) },
    });

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.agentTask.update({
      where: { id: agentTaskId },
      data: { status: "failed", error: message },
    });
    throw err; // re-throw so BullMQ records the failure
  }
}

export function startWorker() {
  const worker = new Worker<AgentJobData>("agent-tasks", processJob, {
    connection: connectionOpts,
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} (${job.data.taskType}) completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} (${job?.data?.taskType}) failed:`, err.message);
  });

  console.log("[worker] Agent worker started, waiting for jobs…");
  return worker;
}
