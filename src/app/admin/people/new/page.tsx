import { prisma } from '@/lib/prisma';
import PersonForm from '@/components/PersonForm';

async function getNextPersonId(): Promise<string> {
  // Find the highest existing numeric ID
  const latest = await prisma.person.findFirst({
    where: { id: { startsWith: '@I' } },
    orderBy: { id: 'desc' },
  });

  if (!latest) return '@I500001@';

  const match = latest.id.match(/@I(\d+)@/);
  if (!match) return '@I500001@';

  const next = parseInt(match[1], 10) + 1;
  return `@I${next}@`;
}

export default async function NewPersonPage() {
  const nextId = await getNextPersonId();

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">New Person</h1>
      </div>
      <PersonForm nextId={nextId} />
    </div>
  );
}
