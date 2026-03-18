import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth";
import { sendApprovalEmail } from "@/src/lib/email";
import { prisma } from "@/src/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireRole("admin");
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const { role } = body as { role?: string };
  const validRoles = ["pending", "viewer", "editor", "admin"];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json(
      { error: "Valid role is required", code: "INVALID_ROLE" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json(
      { error: "User not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  // Send approval email when moving out of pending (best-effort)
  if (target.role === "pending" && role !== "pending") {
    try {
      const loginUrl = `${process.env.AUTH_URL ?? ""}/login`;
      await sendApprovalEmail({
        toEmail: updated.email,
        toName: updated.name ?? updated.email,
        loginUrl,
      });
    } catch {
      // email failure is not fatal
    }
  }

  return NextResponse.json(updated);
}
