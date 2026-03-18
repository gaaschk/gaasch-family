import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import TreeAdminClient from "./TreeAdminClient";

export default async function TreeAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auth = await requireTreeAccess(slug, "admin");
  if (auth instanceof NextResponse) redirect(`/trees/${slug}`);

  const [members, pendingInvites] = await Promise.all([
    prisma.treeMember.findMany({
      where: { treeId: auth.tree.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.treeInvite.findMany({
      where: {
        treeId: auth.tree.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

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
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
          <a href={`/trees/${slug}`} style={{ color: "var(--text-link)", textDecoration: "none" }}>
            {auth.tree.name}
          </a>
          {" / "}Admin
        </p>
        <h1
          className="font-display"
          style={{ fontSize: "2rem", fontWeight: 600, color: "var(--brown-text)" }}
        >
          Tree settings
        </h1>
      </div>

      <TreeAdminClient
        treeId={auth.tree.id}
        treeName={auth.tree.name}
        treeSlug={slug}
        members={members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
        }))}
        pendingInvites={pendingInvites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        currentUserId={auth.userId}
      />
    </main>
  );
}
