import { redirect } from "next/navigation";
import { requireRole } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { NextResponse } from "next/server";
import UserApprovalList from "./UserApprovalList";

export default async function UsersAdminPage() {
  const auth = await requireRole("admin");
  if (auth instanceof NextResponse) redirect("/dashboard");

  const pendingUsers = await prisma.user.findMany({
    where: { role: "pending" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const allUsers = await prisma.user.findMany({
    where: { role: { not: "pending" } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main
      style={{
        maxWidth: "48rem",
        margin: "0 auto",
        padding: "3rem 1.5rem",
        minHeight: "100vh",
        background: "var(--surface-base)",
      }}
    >
      <h1
        className="font-display"
        style={{
          fontSize: "2rem",
          fontWeight: 600,
          color: "var(--brown-text)",
          marginBottom: "0.5rem",
        }}
      >
        User management
      </h1>
      <p style={{ color: "var(--brown-muted)", marginBottom: "3rem" }}>
        Approve pending access requests and manage user roles.
      </p>

      <UserApprovalList pendingUsers={pendingUsers} allUsers={allUsers} />
    </main>
  );
}
