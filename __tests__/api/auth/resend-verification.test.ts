import { POST } from "@/app/api/auth/resend-verification/route";
import * as email from "@/src/lib/email";
import { prisma } from "@/src/lib/prisma";

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    emailVerificationToken: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/src/lib/email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

// Mock requireRole from src/lib/auth
jest.mock("@/src/lib/auth", () => ({
  requireRole: jest.fn(),
}));

import { requireRole } from "@/src/lib/auth";

const mockAuth = {
  userId: "user_1",
  email: "test@example.com",
  role: "viewer",
};

const mockUser = {
  id: "user_1",
  emailVerified: null,
  name: "Test User",
};

function makeRequest() {
  return new Request("http://localhost/api/auth/resend-verification", {
    method: "POST",
  });
}

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    const { NextResponse } = await import("next/server");
    (requireRole as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: "Unauthenticated" }, { status: 401 }),
    );

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 200 no-op when already verified", async () => {
    (requireRole as jest.Mock).mockResolvedValue(mockAuth);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      emailVerified: new Date(),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(email.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("returns 429 when a token was created in the last 60 seconds", async () => {
    (requireRole as jest.Mock).mockResolvedValue(mockAuth);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.emailVerificationToken.findFirst as jest.Mock).mockResolvedValue({
      id: "tok_1",
      createdAt: new Date(),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.code).toBe("RATE_LIMITED");
  });

  it("deletes old tokens, creates new one, and sends email on success", async () => {
    (requireRole as jest.Mock).mockResolvedValue(mockAuth);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.emailVerificationToken.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
    (prisma.emailVerificationToken.deleteMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (prisma.emailVerificationToken.create as jest.Mock).mockResolvedValue({
      id: "tok_2",
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(prisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: mockAuth.userId },
    });
    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: mockAuth.userId }),
      }),
    );

    // Fire-and-forget — give microtask a tick
    await Promise.resolve();
    expect(email.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: mockAuth.email }),
    );
  });
});
