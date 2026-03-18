import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { getAgentQueue } from "@/src/lib/queue";

// GET: list all agent tasks for a tree
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ treeId: string }> },
) {
  const { treeId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);

  const tasks = await prisma.agentTask.findMany({
    where: { treeId: auth.tree.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });

  return NextResponse.json(tasks);
}

// POST: enqueue a new agent task
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

  const { taskType, input } = body as {
    taskType?: string;
    input?: Record<string, unknown>;
  };

  const validTypes = ["research", "geocode", "narrative-batch"];
  if (!taskType || !validTypes.includes(taskType)) {
    return apiError(
      "INVALID_TASK_TYPE",
      `taskType must be one of: ${validTypes.join(", ")}`,
    );
  }

  // Validate input per task type
  if (taskType === "research") {
    if (!input?.personId || typeof input.personId !== "string") {
      return apiError(
        "MISSING_PERSON_ID",
        "research tasks require input.personId",
      );
    }
    const exists = await prisma.person.findFirst({
      where: { id: input.personId as string, treeId: auth.tree.id },
      select: { id: true },
    });
    if (!exists)
      return apiError("NOT_FOUND", "Person not found", undefined, 404);
  }

  if (taskType === "narrative-batch") {
    const personIds = input?.personIds as string[] | undefined;
    if (!personIds?.length) {
      // Default: all people in this tree without a narrative
      const people = await prisma.person.findMany({
        where: { treeId: auth.tree.id, narrative: null },
        select: { id: true },
        take: 100,
      });
      if (!people.length) {
        return apiError(
          "NOTHING_TO_DO",
          "All people in this tree already have narratives",
        );
      }
      (input as Record<string, unknown>).personIds = people.map((p) => p.id);
    }
  }

  const inputJson = JSON.stringify(input ?? {});

  const task = await prisma.agentTask.create({
    data: {
      treeId: auth.tree.id,
      triggeredBy: auth.userId,
      taskType,
      inputJson,
      status: "pending",
    },
  });

  // Enqueue in BullMQ if Redis is available; otherwise keep as pending
  // (can be picked up later by a polling mechanism or manual trigger)
  const queue = getAgentQueue();
  if (queue) {
    await queue.add(taskType, {
      agentTaskId: task.id,
      treeId: auth.tree.id,
      taskType: taskType as "research" | "geocode" | "narrative-batch",
      inputJson,
    });
  }

  return NextResponse.json(task, { status: 201 });
}
