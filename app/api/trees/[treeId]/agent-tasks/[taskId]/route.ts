import { type NextRequest, NextResponse } from "next/server";
import { apiError, requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

type Params = { treeId: string; taskId: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, taskId } = await params;
  const auth = await requireTreeAccess(treeId, "editor");
  if (auth instanceof NextResponse) return auth;

  const task = await prisma.agentTask.findFirst({
    where: { id: taskId, treeId: auth.tree.id },
    include: {
      proposed: {
        where: { status: "pending" },
        take: 20,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) return apiError("NOT_FOUND", "Task not found", undefined, 404);

  return NextResponse.json(task);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { treeId, taskId } = await params;
  const auth = await requireTreeAccess(treeId, "admin");
  if (auth instanceof NextResponse) return auth;

  const task = await prisma.agentTask.findFirst({
    where: { id: taskId, treeId: auth.tree.id },
  });
  if (!task) return apiError("NOT_FOUND", "Task not found", undefined, 404);

  await prisma.agentTask.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}
