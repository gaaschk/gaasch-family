import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { requireTreeAccess } from '@/lib/auth';
import PersonForm from '@/components/PersonForm';

type Props = { params: Promise<{ slug: string }> };

export default async function NewPersonPage({ params }: Props) {
  const { slug } = await params;

  const access = await requireTreeAccess(slug, 'editor');
  if (access instanceof NextResponse) redirect('/dashboard');

  const { tree } = access;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">New Person</h1>
      </div>
      <PersonForm treeSlug={tree.slug} />
    </div>
  );
}
