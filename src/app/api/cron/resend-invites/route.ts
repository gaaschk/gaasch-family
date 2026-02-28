import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTreeInviteEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Auto-resend config
const RESEND_INTERVAL_DAYS = 3;   // resend after this many days of no response
const MAX_SENT_COUNT       = 3;   // stop after this many total sends (1 initial + 2 auto)

export async function POST(req: NextRequest) {
  // Verify Vercel cron secret (or CRON_SECRET env var for self-hosted)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RESEND_INTERVAL_DAYS);

  // Find pending invites that haven't been responded to and are due for a resend
  const invites = await prisma.treeInvite.findMany({
    where: {
      acceptedAt: null,
      sentCount:  { lt: MAX_SENT_COUNT },
      lastSentAt: { lte: cutoff },
      expiresAt:  { gt: new Date() },
    },
    include: {
      tree: { select: { name: true } },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const invite of invites) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      await prisma.treeInvite.update({
        where: { id: invite.id },
        data: {
          expiresAt,
          lastSentAt: new Date(),
          sentCount:  { increment: 1 },
        },
      });

      await sendTreeInviteEmail(invite.email, {
        treeName:     invite.tree.name,
        role:         invite.role,
        token:        invite.token,
        inviterEmail: 'no-reply',
      });

      sent++;
    } catch (err) {
      console.error(`[cron:resend-invites] failed for invite ${invite.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: invites.length });
}
