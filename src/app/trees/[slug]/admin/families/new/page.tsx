import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import FamilyForm from '@/components/FamilyForm';

type Props = { params: Promise<{ slug: string }> };

export default async function NewFamilyPage({ params }: Props) {
  const { slug } = await params;

  const access = await requireTreeAccess(slug, 'editor');
  if (access instanceof NextResponse) redirect('/dashboard');

  const { tree } = access;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">New Family</h1>
      </div>
      <FamilyForm treeSlug={tree.slug} />
    </div>
  );
}
