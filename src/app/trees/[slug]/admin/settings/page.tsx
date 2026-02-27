import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { requireTreeAccess } from '@/lib/auth';
import SettingsClient from './SettingsClient';

type Props = { params: Promise<{ slug: string }> };

export default async function TreeSettingsPage({ params }: Props) {
  const { slug } = await params;

  const auth = await requireTreeAccess(slug, 'admin');
  if (auth instanceof NextResponse) {
    redirect(`/trees/${slug}`);
  }

  return <SettingsClient treeSlug={slug} />;
}
