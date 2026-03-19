import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/verify-email/route";
import { prisma } from "@/src/lib/prisma";

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    emailVerificationToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: { update: jest.fn() },
  },
}));

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/auth/verify-email?token=${token}`
    : "http://localhost/api/auth/verify-email";
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/auth/verify-email", () => {
  beforeEach(() => jest.clearAllMocks());

  it("redirects to /login?error=invalid_token when no token param", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=invalid_token");
  });

  it("redirects to /login?error=invalid_token when token not found", async () => {
    (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(
      null,
    );

    const res = await GET(makeRequest("nonexistent_token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=invalid_token");
  });

  it("redirects to /login?error=token_expired and deletes token when expired", async () => {
    const expiredToken = {
      token: "expired_token",
      userId: "user_1",
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    };
    (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(
      expiredToken,
    );
    (prisma.emailVerificationToken.delete as jest.Mock).mockResolvedValue(
      expiredToken,
    );

    const res = await GET(makeRequest("expired_token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=token_expired");
    expect(prisma.emailVerificationToken.delete).toHaveBeenCalledWith({
      where: { token: "expired_token" },
    });
  });

  it("sets emailVerified, deletes token, and redirects to /dashboard?verified=1 on valid token", async () => {
    const validToken = {
      token: "valid_token",
      userId: "user_1",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    };
    (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(
      validToken,
    );
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user_1" });
    (prisma.emailVerificationToken.delete as jest.Mock).mockResolvedValue(
      validToken,
    );

    const res = await GET(makeRequest("valid_token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard?verified=1");

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: expect.objectContaining({ emailVerified: expect.any(Date) }),
      }),
    );
    expect(prisma.emailVerificationToken.delete).toHaveBeenCalledWith({
      where: { token: "valid_token" },
    });
  });
});
