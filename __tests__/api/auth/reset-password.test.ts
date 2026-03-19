import bcrypt from "bcryptjs";
import { POST } from "@/app/api/auth/reset-password/route";
import { prisma } from "@/src/lib/prisma";

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    passwordResetToken: { findUnique: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("new_hash"),
}));

const mockToken = {
  id: "tok_1",
  token: "abc123",
  userId: "user_1",
  expiresAt: new Date(Date.now() + 60_000),
  usedAt: null,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({ password: "validpass123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeRequest({ token: "abc123" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(makeRequest({ token: "abc123", password: "short" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/8 characters/);
  });

  it("returns 400 when token is not found in DB", async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(
      makeRequest({ token: "unknown", password: "validpass123" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid or has expired/);
  });

  it("returns 400 when token has already been used", async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
      ...mockToken,
      usedAt: new Date(),
    });
    const res = await POST(
      makeRequest({ token: "abc123", password: "validpass123" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when token is expired", async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
      ...mockToken,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    });
    const res = await POST(
      makeRequest({ token: "abc123", password: "validpass123" }),
    );
    expect(res.status).toBe(400);
  });

  it("updates password and marks token used in a transaction for valid token", async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(
      mockToken,
    );
    (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const res = await POST(
      makeRequest({ token: "abc123", password: "validpass123" }),
    );

    expect(res.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith("validpass123", 12);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("returns 500 with user-friendly message when DB transaction fails", async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(
      mockToken,
    );
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error("DB connection lost"),
    );

    const res = await POST(
      makeRequest({ token: "abc123", password: "validpass123" }),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/something went wrong/i);
  });
});
