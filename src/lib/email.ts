import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport(process.env.EMAIL_SERVER as string);
}

export async function sendVerificationEmail(to: string, token: string) {
  const base = process.env.AUTH_URL ?? 'http://localhost:3000';
  const url  = `${base}/set-password?token=${token}&email=${encodeURIComponent(to)}`;
  await createTransport().sendMail({
    from:    process.env.EMAIL_FROM,
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
  await createTransport().sendMail({
    from:    process.env.EMAIL_FROM,
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
  await createTransport().sendMail({
    from:    process.env.EMAIL_FROM,
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
