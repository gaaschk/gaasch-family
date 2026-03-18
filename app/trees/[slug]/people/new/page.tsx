import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireTreeAccess } from "@/src/lib/auth";
import PersonForm from "../PersonForm";

export default async function NewPersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auth = await requireTreeAccess(slug, "editor");
  if (auth instanceof NextResponse) redirect(`/trees/${slug}`);

  return (
    <main
      style={{
        maxWidth: "40rem",
        margin: "0 auto",
        padding: "3rem 1.5rem",
        minHeight: "100vh",
        background: "var(--surface-base)",
      }}
    >
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
          <a href={`/trees/${slug}`} style={{ color: "var(--text-link)", textDecoration: "none" }}>
            {auth.tree.name}
          </a>
          {" / "}Add person
        </p>
        <h1
          className="font-display"
          style={{ fontSize: "2rem", fontWeight: 600, color: "var(--brown-text)" }}
        >
          Add a person
        </h1>
      </div>
      <PersonForm treeId={auth.tree.id} treeSlug={slug} mode="create" />
    </main>
  );
}
