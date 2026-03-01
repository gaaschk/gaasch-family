import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGeniAuthUrl } from '@/lib/geni';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Encode treeSlug in state so we can redirect back after OAuth
  const treeSlug = req.nextUrl.searchParams.get('treeSlug') ?? '';
  const state = Buffer.from(JSON.stringify({ treeSlug, userId: session.user.id })).toString('base64url');

  return NextResponse.redirect(await getGeniAuthUrl(state));
}
