import nodemailer from "nodemailer";

function getTransport() {
  const server = process.env.EMAIL_SERVER;
  if (!server) throw new Error("EMAIL_SERVER is not set");
  return nodemailer.createTransport(server);
}

const FROM = process.env.EMAIL_FROM ?? "Heirloom <noreply@example.com>";

export async function sendSignupNotificationEmail(opts: {
  newUserName: string;
  newUserEmail: string;
  adminEmails: string[];
  approveUrl: string;
}) {
  if (opts.adminEmails.length === 0) return;
  const transport = getTransport();
  await transport.sendMail({
    from: FROM,
    to: opts.adminEmails.join(", "),
    subject: `New access request: ${opts.newUserName}`,
    text: [
      `${opts.newUserName} (${opts.newUserEmail}) has requested access to Heirloom.`,
      "",
      `Approve here: ${opts.approveUrl}`,
    ].join("\n"),
    html: `
      <p><strong>${opts.newUserName}</strong> (${opts.newUserEmail}) has requested access to Heirloom.</p>
      <p><a href="${opts.approveUrl}">Review pending users</a></p>
    `,
  });
}

export async function sendTreeInviteEmail(opts: {
  toEmail: string;
  treeName: string;
  inviteUrl: string;
  role: string;
}) {
  const transport = getTransport();
  await transport.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: `You've been invited to join ${opts.treeName} on Heirloom`,
    text: [
      `You've been invited to join "${opts.treeName}" on Heirloom as a ${opts.role}.`,
      "",
      `Accept your invitation: ${opts.inviteUrl}`,
      "",
      "This link expires in 7 days.",
    ].join("\n"),
    html: `
      <p>You've been invited to join <strong>${opts.treeName}</strong> on Heirloom as a <strong>${opts.role}</strong>.</p>
      <p><a href="${opts.inviteUrl}">Accept invitation</a></p>
      <p style="color:#888;font-size:12px">This link expires in 7 days.</p>
    `,
  });
}

export async function sendApprovalEmail(opts: {
  toEmail: string;
  toName: string;
  loginUrl: string;
}) {
  const transport = getTransport();
  await transport.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Your Heirloom access has been approved",
    text: [
      `Hi ${opts.toName},`,
      "",
      "Your access to Heirloom has been approved. You can sign in now:",
      opts.loginUrl,
    ].join("\n"),
    html: `
      <p>Hi ${opts.toName},</p>
      <p>Your access to Heirloom has been approved.</p>
      <p><a href="${opts.loginUrl}">Sign in to Heirloom</a></p>
    `,
  });
}
