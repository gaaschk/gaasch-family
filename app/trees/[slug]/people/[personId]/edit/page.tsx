import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import PersonForm from "../../PersonForm";

type Params = { slug: string; personId: string };

export default async function EditPersonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, personId } = await params;
  const auth = await requireTreeAccess(slug, "editor");
  if (auth instanceof NextResponse)
    redirect(`/trees/${slug}/people/${personId}`);

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: auth.tree.id },
  });
  if (!person) notFound();

  const fullName =
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    "(unnamed)";

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
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            marginBottom: "0.25rem",
          }}
        >
          <Link
            href={`/trees/${slug}`}
            style={{ color: "var(--text-link)", textDecoration: "none" }}
          >
            {auth.tree.name}
          </Link>
          {" / "}
          <Link
            href={`/trees/${slug}/people/${personId}`}
            style={{ color: "var(--text-link)", textDecoration: "none" }}
          >
            {fullName}
          </Link>
          {" / "}Edit
        </p>
        <h1
          className="font-display"
          style={{
            fontSize: "2rem",
            fontWeight: 600,
            color: "var(--brown-text)",
          }}
        >
          Edit {fullName}
        </h1>
      </div>
      <PersonForm
        treeId={auth.tree.id}
        treeSlug={slug}
        mode="edit"
        personId={personId}
        initial={{
          firstName: person.firstName ?? "",
          lastName: person.lastName ?? "",
          maidenName: person.maidenName ?? "",
          gender: person.gender ?? "",
          birthDate: person.birthDate ?? "",
          birthPlace: person.birthPlace ?? "",
          deathDate: person.deathDate ?? "",
          deathPlace: person.deathPlace ?? "",
          occupation: person.occupation ?? "",
          notes: person.notes ?? "",
        }}
      />
    </main>
  );
}
