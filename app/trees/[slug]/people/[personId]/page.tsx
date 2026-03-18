import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { presignGet } from "@/src/lib/s3";
import DocumentsSection from "./DocumentsSection";
import PersonActions from "./PersonActions";

type Params = { slug: string; personId: string };

export default async function PersonPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, personId } = await params;
  const auth = await requireTreeAccess(slug, "viewer");
  if (auth instanceof NextResponse) redirect(`/trees/${slug}`);

  const person = await prisma.person.findFirst({
    where: { id: personId, treeId: auth.tree.id },
    include: {
      portrait: { select: { id: true, s3Key: true } },
      documents: {
        orderBy: { createdAt: "asc" },
      },
      childInFamilies: {
        include: {
          family: {
            include: {
              husband: {
                select: { id: true, firstName: true, lastName: true },
              },
              wife: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      husbandInFamilies: {
        include: {
          wife: { select: { id: true, firstName: true, lastName: true } },
          children: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                },
              },
            },
          },
        },
      },
      wifeInFamilies: {
        include: {
          husband: { select: { id: true, firstName: true, lastName: true } },
          children: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  gender: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!person) notFound();

  const canEdit = auth.treeRole === "editor" || auth.treeRole === "admin";
  const fullName =
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    "(unnamed)";

  // Presign portrait and all document URLs
  const portraitUrl = person.portrait?.s3Key
    ? await presignGet(person.portrait.s3Key).catch(() => null)
    : null;
  const docsWithUrls = await Promise.all(
    person.documents.map(async (d) => ({
      ...d,
      url: await presignGet(d.s3Key).catch(() => ""),
    })),
  );

  const parents = person.childInFamilies.flatMap((fc) => {
    const fam = fc.family;
    return [fam.husband, fam.wife].filter(Boolean) as (typeof fam.husband)[];
  });

  const spouseFamilies = [
    ...person.husbandInFamilies,
    ...person.wifeInFamilies,
  ];

  return (
    <main style={{ background: "var(--surface-base)", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--cream-border)",
          background: "var(--surface-raised)",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {portraitUrl && (
          <div
            style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid var(--cream-border)",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <Image
              src={portraitUrl}
              alt={fullName}
              fill
              style={{ objectFit: "cover" }}
              sizes="80px"
              unoptimized
            />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginBottom: "0.25rem",
            }}
          >
            <Link
              href="/dashboard"
              style={{ color: "var(--text-link)", textDecoration: "none" }}
            >
              My Trees
            </Link>
            {" / "}
            <Link
              href={`/trees/${slug}`}
              style={{ color: "var(--text-link)", textDecoration: "none" }}
            >
              {auth.tree.name}
            </Link>
          </p>
          <h1
            className="font-display"
            style={{
              fontSize: "2rem",
              fontWeight: 600,
              color: "var(--brown-text)",
              lineHeight: 1.2,
            }}
          >
            {fullName}
          </h1>
          {person.maidenName && person.maidenName !== person.lastName && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
              née {person.maidenName}
            </p>
          )}
        </div>
        {canEdit && (
          <PersonActions
            personId={person.id}
            treeId={auth.tree.id}
            treeSlug={slug}
          />
        )}
      </header>

      <div
        style={{
          maxWidth: "52rem",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
        }}
      >
        {/* Vital facts */}
        <section>
          <SectionLabel>Facts</SectionLabel>
          <FactGrid>
            {person.gender && (
              <Fact
                label="Gender"
                value={
                  person.gender === "M"
                    ? "Male"
                    : person.gender === "F"
                      ? "Female"
                      : "Other"
                }
              />
            )}
            {person.birthDate && (
              <Fact
                label="Born"
                value={[person.birthDate, person.birthPlace]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
            {person.deathDate && (
              <Fact
                label="Died"
                value={[person.deathDate, person.deathPlace]
                  .filter(Boolean)
                  .join(" · ")}
              />
            )}
            {!person.deathDate && person.deathPlace && (
              <Fact label="Death place" value={person.deathPlace} />
            )}
            {person.occupation && (
              <Fact label="Occupation" value={person.occupation} />
            )}
          </FactGrid>
        </section>

        {/* Family */}
        {(parents.length > 0 || spouseFamilies.length > 0) && (
          <section>
            <SectionLabel>Family</SectionLabel>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {parents.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Parents
                  </p>
                  <div
                    style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                  >
                    {parents.map(
                      (p) =>
                        p && <PersonChip key={p.id} person={p} slug={slug} />,
                    )}
                  </div>
                </div>
              )}
              {spouseFamilies.map((fam, i) => {
                const spouse = "wife" in fam ? fam.wife : fam.husband;
                const children = fam.children;
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: spouse families have no stable id
                  <div key={i}>
                    {spouse && (
                      <div style={{ marginBottom: "0.5rem" }}>
                        <p
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--text-muted)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {person.gender === "M"
                            ? "Wife"
                            : person.gender === "F"
                              ? "Husband"
                              : "Spouse"}
                        </p>
                        <PersonChip person={spouse} slug={slug} />
                      </div>
                    )}
                    {children.length > 0 && (
                      <div>
                        <p
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--text-muted)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Children ({children.length})
                        </p>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {children.map((fc) => (
                            <PersonChip
                              key={fc.person.id}
                              person={fc.person}
                              slug={slug}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Narrative */}
        {person.narrative && (
          <section>
            <SectionLabel>Biography</SectionLabel>
            <div
              className="font-narrative"
              style={{
                lineHeight: 1.8,
                color: "var(--text-primary)",
                fontSize: "1.0625rem",
              }}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: narrative is AI-generated HTML, sanitized upstream
              dangerouslySetInnerHTML={{ __html: person.narrative }}
            />
          </section>
        )}

        {/* Notes */}
        {person.notes && (
          <section>
            <SectionLabel>Notes</SectionLabel>
            <p
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
              {person.notes}
            </p>
          </section>
        )}

        {/* Documents & Photos */}
        {(docsWithUrls.length > 0 || canEdit) && (
          <section>
            <SectionLabel>Documents &amp; Photos</SectionLabel>
            <DocumentsSection
              treeId={auth.tree.id}
              personId={person.id}
              initialDocs={docsWithUrls}
              canEdit={canEdit}
            />
          </section>
        )}
      </div>
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
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </h2>
  );
}

function FactGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "0.75rem 1.5rem",
      }}
    >
      {children}
    </dl>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
          marginBottom: "0.2rem",
        }}
      >
        {label}
      </dt>
      <dd style={{ color: "var(--text-primary)", fontSize: "0.9375rem" }}>
        {value}
      </dd>
    </div>
  );
}

function PersonChip({
  person,
  slug,
}: {
  person: { id: string; firstName?: string | null; lastName?: string | null };
  slug: string;
}) {
  const name =
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    "(unnamed)";
  return (
    <Link
      href={`/trees/${slug}/people/${person.id}`}
      style={{
        padding: "0.35rem 0.875rem",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--cream-border)",
        background: "var(--surface-raised)",
        color: "var(--text-primary)",
        fontSize: "0.875rem",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </Link>
  );
}
