import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exchangeCode, fsGet } from '@/lib/familysearch';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface FsCurrentUser {
  users?: { id?: string; displayName?: string }[];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Decode state to get treeSlug
  let treeSlug = '';
  try {
    const decoded = JSON.parse(Buffer.from(state ?? '', 'base64url').toString());
    treeSlug = decoded.treeSlug ?? '';
  } catch { /* ignore */ }

  const redirectTo = treeSlug
    ? `/trees/${treeSlug}/admin/familysearch`
    : '/dashboard';

  if (error || !code) {
    return NextResponse.redirect(new URL(`${redirectTo}?fs_error=${error ?? 'cancelled'}`, req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Get FamilySearch display name
    let displayName: string | null = null;
    let fsCisId: string | null = null;
    try {
      const me = await fsGet<FsCurrentUser>('/platform/users/current', tokens.access_token);
      const user = me.users?.[0];
      fsCisId     = user?.id ?? null;
      displayName = user?.displayName ?? null;
    } catch { /* display name is optional */ }

    await prisma.familySearchToken.upsert({
      where:  { userId: session.user.id },
      update: {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        displayName,
        fsCisId,
        updatedAt: new Date(),
      },
      create: {
        userId:       session.user.id,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        displayName,
        fsCisId,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth error';
    return NextResponse.redirect(new URL(`${redirectTo}?fs_error=${encodeURIComponent(msg)}`, req.url));
  }

  return NextResponse.redirect(new URL(`${redirectTo}?fs_connected=1`, req.url));
}
