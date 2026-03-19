import { POST } from "@/app/api/auth/forgot-password/route";
import { prisma } from "@/src/lib/prisma";
import * as email from "@/src/lib/email";

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock("@/src/lib/email", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockUser = { id: "user_1", email: "test@example.com", name: "Test", passwordHash: "hashed" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is not a string", async () => {
    const res = await POST(makeRequest({ email: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 without sending email when user not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "nobody@example.com" }));
    expect(res.status).toBe(200);
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns 200 without sending email for OAuth-only user (no passwordHash)", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, passwordHash: null });
    const res = await POST(makeRequest({ email: mockUser.email }));
    expect(res.status).toBe(200);
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("expires existing tokens and creates a new one for a valid user", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: "tok_1" });

    const res = await POST(makeRequest({ email: mockUser.email }));

    expect(res.status).toBe(200);
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: mockUser.id, usedAt: null } }),
    );
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: mockUser.id }) }),
    );
    // Email is fire-and-forget; give it a tick to resolve
    await Promise.resolve();
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: mockUser.email }),
    );
  });

  it("still returns 200 when email sending fails", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({ id: "tok_2" });
    (email.sendPasswordResetEmail as jest.Mock).mockRejectedValue(new Error("SMTP error"));

    const res = await POST(makeRequest({ email: mockUser.email }));
    expect(res.status).toBe(200);
  });

  it("normalises email to lowercase before lookup", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await POST(makeRequest({ email: "  TEST@EXAMPLE.COM  " }));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });
});
