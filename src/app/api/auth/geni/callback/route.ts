import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exchangeGeniCode, getGeniProfile } from '@/lib/geni';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
    ? `/trees/${treeSlug}/admin/geni`
    : '/dashboard';

  if (error || !code) {
    return NextResponse.redirect(new URL(`${redirectTo}?geni_error=${error ?? 'cancelled'}`, req.url));
  }

  try {
    const tokens = await exchangeGeniCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Get Geni display name and id
    let displayName: string | null = null;
    let geniId: string | null = null;
    try {
      const profile = await getGeniProfile(tokens.access_token);
      geniId      = profile.id ?? null;
      displayName = profile.displayName ?? null;
    } catch { /* display name is optional */ }

    await prisma.geniToken.upsert({
      where:  { userId: session.user.id },
      update: {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        displayName,
        geniId,
        updatedAt: new Date(),
      },
      create: {
        userId:       session.user.id,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        displayName,
        geniId,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth error';
    return NextResponse.redirect(new URL(`${redirectTo}?geni_error=${encodeURIComponent(msg)}`, req.url));
  }

  return NextResponse.redirect(new URL(`${redirectTo}?geni_connected=1`, req.url));
}
