import Link from "next/link";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import ChatWidget from "./ChatWidget";
import FanChartView from "./FanChartView";
import PedigreeView from "./PedigreeView";
import PeopleDirectory from "./PeopleDirectory";
import TreeSwitcher from "./TreeSwitcher";
import ViewTabs from "./ViewTabs";

export default async function TreePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    view?: string;
    root?: string;
    agens?: string;
    dgens?: string;
  }>;
}) {
  const { slug } = await params;
  const { view = "list", root, agens, dgens } = await searchParams;
  const auth = await requireTreeAccess(slug, "viewer");
  if (auth instanceof NextResponse) redirect("/dashboard");

  const ancestorGens = Math.min(Math.max(1, parseInt(agens ?? "4", 10)), 6);
  const descendantGens = Math.min(Math.max(0, parseInt(dgens ?? "0", 10)), 4);

  const [total, recent, myTrees] = await Promise.all([
    prisma.person.count({ where: { treeId: auth.tree.id } }),
    prisma.person.findMany({
      where: { treeId: auth.tree.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        deathDate: true,
      },
    }),
    // Fetch all trees this user can access (owned + member)
    prisma.tree.findMany({
      where: {
        OR: [
          { ownerId: auth.userId },
          { members: { some: { userId: auth.userId } } },
        ],
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canEdit = auth.treeRole === "editor" || auth.treeRole === "admin";

  return (
    <main style={{ background: "var(--surface-base)", minHeight: "100vh" }}>
      {/* Top bar */}
      <header
        style={{
          borderBottom: "1px solid var(--cream-border)",
          background: "var(--surface-raised)",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginBottom: "0.1rem",
            }}
          >
            <TreeSwitcher currentSlug={slug} trees={myTrees} />
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "var(--brown-text)",
              lineHeight: 1.2,
            }}
          >
            {auth.tree.name}
          </h1>
          <ViewTabs slug={slug} currentView={view} />
        </div>
        <nav
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {auth.treeRole === "admin" && (
            <Link
              href={`/trees/${slug}/admin`}
              style={{
                padding: "0.4rem 0.875rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--cream-border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Settings
            </Link>
          )}
          {canEdit && (
            <Link
              href={`/trees/${slug}/people/new`}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "var(--radius-md)",
                background: "var(--forest)",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              + Add person
            </Link>
          )}
        </nav>
      </header>

      {view === "list" && (
        <div
          style={{
            maxWidth: "64rem",
            margin: "0 auto",
            padding: "2rem 1.5rem",
          }}
        >
          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              marginBottom: "2.5rem",
              flexWrap: "wrap",
            }}
          >
            <StatCard label="People" value={total} />
            {auth.tree.description && (
              <p
                style={{
                  flex: 1,
                  color: "var(--text-muted)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.6,
                  alignSelf: "center",
                }}
              >
                {auth.tree.description}
              </p>
            )}
          </div>

          {/* Recently updated */}
          {recent.length > 0 && (
            <section style={{ marginBottom: "2.5rem" }}>
              <h2
                className="font-ui"
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--brown-muted)",
                  marginBottom: "0.75rem",
                }}
              >
                Recently updated
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {recent.map((p) => (
                  <Link
                    key={p.id}
                    href={`/trees/${slug}/people/${p.id}`}
                    style={{
                      padding: "0.4rem 0.875rem",
                      borderRadius: "var(--radius-full)",
                      border: "1px solid var(--cream-border)",
                      background: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      fontSize: "0.875rem",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {[p.firstName, p.lastName].filter(Boolean).join(" ") ||
                      "(unnamed)"}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Directory */}
          <PeopleDirectory
            treeId={auth.tree.id}
            treeSlug={slug}
            canEdit={canEdit}
            initialTotal={total}
          />
        </div>
      )}

      {view === "pedigree" && (
        <div style={{ padding: "2rem 1.5rem" }}>
          <PedigreeView
            treeId={auth.tree.id}
            treeSlug={slug}
            rootPersonId={root}
            ancestorGens={ancestorGens}
            descendantGens={descendantGens}
          />
        </div>
      )}

      {view === "fan" && (
        <div style={{ padding: "2rem 1.5rem" }}>
          <FanChartView
            treeId={auth.tree.id}
            treeSlug={slug}
            rootPersonId={root}
            ancestorGens={ancestorGens}
            descendantGens={descendantGens}
          />
        </div>
      )}

      <ChatWidget
        treeId={auth.tree.id}
        treeSlug={slug}
        treeRole={auth.treeRole}
      />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--cream-border)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem 1.5rem",
        minWidth: "8rem",
        textAlign: "center",
      }}
    >
      <p
        className="font-display"
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "var(--brown-text)",
          lineHeight: 1,
        }}
      >
        {value.toLocaleString()}
      </p>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
          marginTop: "0.25rem",
        }}
      >
        {label}
      </p>
    </div>
  );
}
