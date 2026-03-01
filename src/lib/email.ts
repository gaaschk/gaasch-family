import nodemailer from 'nodemailer';
import { getSystemSetting } from './settings';

async function createTransport() {
  const server = await getSystemSetting('email_server', 'EMAIL_SERVER');
  return nodemailer.createTransport(server);
}

async function getFrom() {
  return await getSystemSetting('email_from', 'EMAIL_FROM');
}

async function getBcc(): Promise<string | undefined> {
  const bcc = await getSystemSetting('email_bcc');
  return bcc || undefined;
}

export async function sendVerificationEmail(to: string, token: string, callbackUrl?: string) {
  const base  = process.env.AUTH_URL ?? 'http://localhost:3000';
  const cbParam = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : '';
  const url   = `${base}/set-password?token=${token}&email=${encodeURIComponent(to)}${cbParam}`;
  const transport = await createTransport();
  await transport.sendMail({
    from:    await getFrom(),
    bcc:     await getBcc(),
    to,
    subject: 'Verify your email — Family History',
    text:    `Click the link below to create your password:\n\n${url}\n\nThis link expires in 24 hours.`,
    html:    `
      <p>You requested access to the Family History site.</p>
      <p>Click the link below to create your password:</p>
      <p><a href="${url}">${url}</a></p>
      <p style="color:#888;font-size:0.85em">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const base = process.env.AUTH_URL ?? 'http://localhost:3000';
  const url  = `${base}/set-password?token=${token}&email=${encodeURIComponent(to)}&reset=1`;
  const transport = await createTransport();
  await transport.sendMail({
    from:    await getFrom(),
    bcc:     await getBcc(),
    to,
    subject: 'Reset your password — Family History',
    text:    `Click the link below to reset your password:\n\n${url}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
    html:    `
      <p>You requested a password reset for the Family History site.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${url}">${url}</a></p>
      <p style="color:#888;font-size:0.85em">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
  });
}

export async function sendIssueConfirmationEmail(
  to: string,
  opts: {
    title:       string;
    type:        string;
    number:      number;
    url:         string;
    pageUrl?:    string;
  },
) {
  const typeLabel = opts.type === 'bug' ? 'Bug report' : opts.type === 'feature' ? 'Feature request' : 'Issue';
  const transport = await createTransport();
  await transport.sendMail({
    from:    await getFrom(),
    bcc:     await getBcc(),
    to,
    subject: `Issue #${opts.number} received — ${opts.title}`,
    text: [
      `Your ${typeLabel.toLowerCase()} has been submitted.`,
      '',
      `Title: ${opts.title}`,
      `Issue: ${opts.url}`,
      '',
      `You can view, comment on, or update this issue at any time using the link above.`,
    ].join('\n'),
    html: `
      <p>Your <strong>${typeLabel.toLowerCase()}</strong> has been received.</p>
      <table style="border-collapse:collapse;margin:1em 0">
        <tr><td style="color:#888;padding-right:1em;white-space:nowrap">Title</td><td>${opts.title}</td></tr>
        <tr><td style="color:#888;padding-right:1em;white-space:nowrap">Issue</td><td><a href="${opts.url}">#${opts.number} on GitHub</a></td></tr>
        ${opts.pageUrl ? `<tr><td style="color:#888;padding-right:1em;white-space:nowrap">Page</td><td style="font-size:0.85em;color:#555">${opts.pageUrl}</td></tr>` : ''}
      </table>
      <p><a href="${opts.url}" style="font-size:1.05em">View &amp; update your issue &rarr;</a></p>
      <p style="color:#888;font-size:0.85em">You can add comments or additional details directly on GitHub using the link above.</p>
    `,
  });
}

export async function sendTreeInviteEmail(
  to: string,
  opts: {
    treeName:     string;
    role:         string;
    token:        string;
    inviterEmail: string;
  },
) {
  const base   = process.env.AUTH_URL ?? 'http://localhost:3000';
  const url    = `${base}/invite/${opts.token}`;
  const roleLabel = opts.role.charAt(0).toUpperCase() + opts.role.slice(1);
  const transport = await createTransport();
  await transport.sendMail({
    from:    await getFrom(),
    bcc:     await getBcc(),
    to,
    subject: `You've been invited to ${opts.treeName} — Family History`,
    text:    [
      `${opts.inviterEmail} has invited you to "${opts.treeName}" as ${roleLabel}.`,
      '',
      `Accept your invitation (expires in 7 days):`,
      url,
      '',
      `If you don't have an account yet, you'll be asked to create one first.`,
    ].join('\n'),
    html: `
      <p>${opts.inviterEmail} has invited you to <strong>${opts.treeName}</strong> as <strong>${roleLabel}</strong>.</p>
      <p><a href="${url}" style="font-size:1.1em">Accept invitation &rarr;</a></p>
      <p style="color:#888;font-size:0.85em">This invitation expires in 7 days. If you don't have an account yet, you'll be asked to create one first.</p>
    `,
  });
}
