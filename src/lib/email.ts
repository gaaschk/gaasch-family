import nodemailer from "nodemailer";

function getTransport() {
  const server = process.env.EMAIL_SERVER;
  if (!server) throw new Error("EMAIL_SERVER is not set");
  return nodemailer.createTransport(server);
}

const FROM = process.env.EMAIL_FROM ?? "Heirloom <noreply@example.com>";

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

export async function sendPasswordResetEmail(opts: {
  toEmail: string;
  toName: string;
  resetUrl: string;
}) {
  const transport = getTransport();
  await transport.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Reset your Heirloom password",
    text: [
      `Hi ${opts.toName},`,
      "",
      "Someone requested a password reset for your Heirloom account.",
      "Click the link below to set a new password (expires in 1 hour):",
      "",
      opts.resetUrl,
      "",
      "If you didn't request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>Hi ${opts.toName},</p>
      <p>Someone requested a password reset for your Heirloom account.</p>
      <p><a href="${opts.resetUrl}">Reset your password</a></p>
      <p style="color:#888;font-size:12px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
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

export async function sendWelcomeEmail(opts: {
  toEmail: string;
  toName: string;
}) {
  const transport = getTransport();
  const appUrl = process.env.AUTH_URL ?? "https://heirloom.family";
  await transport.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Your family history starts here",
    text: [
      `Hi ${opts.toName},`,
      "",
      "Your Heirloom account is ready. Start building your family tree at:",
      "",
      appUrl,
      "",
      "If you didn't create this account, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="background:#FAF5EC;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
        <div style="max-width:480px;margin:0 auto;background:#FAF5EC;padding:40px 32px;">
          <p style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#2C1A0E;margin:0 0 24px;">Heirloom</p>
          <p style="font-size:20px;color:#2C1A0E;margin:0 0 16px;">Your family history starts here.</p>
          <p style="font-size:15px;color:#5C3D1E;line-height:1.7;margin:0 0 32px;">
            We're glad you're here, ${opts.toName}. Heirloom is your private space to build, explore,
            and share your family tree — enriched by AI-generated biographies.
          </p>
          <a href="${appUrl}/onboarding" style="display:block;background:#2D4A35;color:#FAF5EC;text-decoration:none;padding:14px 24px;border-radius:6px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;text-align:center;">
            Start building your tree →
          </a>
          <p style="font-size:12px;color:#8B6544;margin:32px 0 0;line-height:1.5;">
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationEmail(opts: {
  toEmail: string;
  toName: string;
  verifyUrl: string;
}) {
  const transport = getTransport();
  await transport.sendMail({
    from: FROM,
    to: opts.toEmail,
    subject: "Verify your Heirloom email address",
    text: [
      `Hi ${opts.toName},`,
      "",
      "Please verify your email address by clicking this link (expires in 24 hours):",
      "",
      opts.verifyUrl,
      "",
      "If you didn't create an Heirloom account, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <div style="background:#FAF5EC;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
        <div style="max-width:480px;margin:0 auto;background:#FAF5EC;padding:40px 32px;">
          <p style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#2C1A0E;margin:0 0 24px;">Heirloom</p>
          <p style="font-size:18px;color:#2C1A0E;margin:0 0 16px;">Verify your email address</p>
          <p style="font-size:15px;color:#5C3D1E;line-height:1.7;margin:0 0 32px;">
            Hi ${opts.toName}, click the button below to verify your email. This link expires in 24 hours.
          </p>
          <a href="${opts.verifyUrl}" style="display:block;background:#2D4A35;color:#FAF5EC;text-decoration:none;padding:14px 24px;border-radius:6px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;text-align:center;">
            Verify email address →
          </a>
          <p style="font-size:12px;color:#8B6544;margin:32px 0 0;line-height:1.5;">
            If you didn't create an Heirloom account, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}
