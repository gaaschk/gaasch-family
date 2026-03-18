import Link from "next/link";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireRole } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export default async function DashboardPage() {
  const auth = await requireRole("viewer");
  if (auth instanceof NextResponse) redirect("/login");

  const [ownedTrees, memberRows] = await Promise.all([
    prisma.tree.findMany({
      where: { ownerId: auth.userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { people: true, members: true } } },
    }),
    prisma.treeMember.findMany({
      where: { userId: auth.userId },
      include: {
        tree: {
          include: { _count: { select: { people: true, members: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const memberTrees = memberRows
    .filter((m) => m.tree.ownerId !== auth.userId)
    .map((m) => ({ ...m.tree, myRole: m.role }));

  const isAdmin = auth.role === "admin";
  const totalTrees = ownedTrees.length + memberTrees.length;

  return (
    <main
      style={{
        maxWidth: "56rem",
        margin: "0 auto",
        padding: "3rem 1.5rem",
        minHeight: "100vh",
        background: "var(--surface-base)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "2.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: "2.25rem",
              fontWeight: 600,
              color: "var(--brown-text)",
              marginBottom: "0.25rem",
            }}
          >
            My Trees
          </h1>
          <p style={{ color: "var(--brown-muted)", fontSize: "0.9375rem" }}>
            {totalTrees === 0
              ? "No trees yet — create your first one."
              : `${totalTrees} tree${totalTrees > 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {isAdmin && (
            <Link
              href="/dashboard/users"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--cream-border)",
                background: "var(--surface-raised)",
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Manage users
            </Link>
          )}
          <Link
            href="/trees/new"
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "var(--radius-md)",
              background: "var(--forest)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
            }}
          >
            + New tree
          </Link>
        </div>
      </div>

      {/* Owned trees */}
      {ownedTrees.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <SectionLabel>Your trees</SectionLabel>
          <TreeGrid>
            {ownedTrees.map((t) => (
              <TreeCard
                key={t.id}
                slug={t.slug}
                name={t.name}
                description={t.description}
                peopleCount={t._count.people}
                memberCount={t._count.members}
                badge="Owner"
                badgeColor="var(--amber)"
                showAdmin
              />
            ))}
          </TreeGrid>
        </section>
      )}

      {/* Member trees */}
      {memberTrees.length > 0 && (
        <section>
          <SectionLabel>Shared with me</SectionLabel>
          <TreeGrid>
            {memberTrees.map((t) => (
              <TreeCard
                key={t.id}
                slug={t.slug}
                name={t.name}
                description={t.description}
                peopleCount={t._count.people}
                memberCount={t._count.members}
                badge={t.myRole}
                badgeColor="var(--forest)"
              />
            ))}
          </TreeGrid>
        </section>
      )}

      {/* Empty state */}
      {totalTrees === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 2rem",
            border: "2px dashed var(--cream-border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <p
            className="font-display"
            style={{
              fontSize: "1.375rem",
              color: "var(--brown-muted)",
              marginBottom: "1.5rem",
            }}
          >
            Start preserving your family history
          </p>
          <Link
            href="/trees/new"
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "var(--radius-md)",
              background: "var(--forest)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1rem",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Create your first tree
          </Link>
        </div>
      )}
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-ui"
      style={{
        fontSize: "0.8125rem",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--brown-muted)",
        marginBottom: "1rem",
      }}
    >
      {children}
    </h2>
  );
}

function TreeGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1rem",
      }}
    >
      {children}
    </div>
  );
}

function TreeCard({
  slug,
  name,
  description,
  peopleCount,
  memberCount,
  badge,
  badgeColor,
  showAdmin,
}: {
  slug: string;
  name: string;
  description: string | null;
  peopleCount: number;
  memberCount: number;
  badge: string;
  badgeColor: string;
  showAdmin?: boolean;
}) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--cream-border)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        transition: "box-shadow var(--duration-short) var(--ease-out)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        <h3
          className="font-display"
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--brown-text)",
            lineHeight: 1.3,
          }}
        >
          {name}
        </h3>
        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "var(--radius-full)",
            background: badgeColor,
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {cap(badge)}
        </span>
      </div>

      {description && (
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "1rem",
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
        }}
      >
        <span>
          {peopleCount} {peopleCount === 1 ? "person" : "people"}
        </span>
        <span>
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginTop: "auto",
          paddingTop: "0.25rem",
        }}
      >
        <Link
          href={`/trees/${slug}`}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0.5rem",
            borderRadius: "var(--radius-md)",
            background: "var(--forest)",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Open tree
        </Link>
        {showAdmin && (
          <Link
            href={`/trees/${slug}/admin`}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--cream-border)",
              background: "var(--surface-base)",
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Admin
          </Link>
        )}
      </div>
    </div>
  );
}
