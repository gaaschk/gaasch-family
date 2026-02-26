import { prisma } from '@/lib/prisma';
import FamilyForm from '@/components/FamilyForm';

async function getNextFamilyId(): Promise<string> {
  const latest = await prisma.family.findFirst({
    where: { id: { startsWith: '@F' } },
    orderBy: { id: 'desc' },
  });

  if (!latest) return '@F500001@';

  const match = latest.id.match(/@F(\d+)@/);
  if (!match) return '@F500001@';

  const next = parseInt(match[1], 10) + 1;
  return `@F${next}@`;
}

export default async function NewFamilyPage() {
  const nextId = await getNextFamilyId();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">New Family</h1>
      </div>
      <FamilyForm nextId={nextId} />
    </div>
  );
}
