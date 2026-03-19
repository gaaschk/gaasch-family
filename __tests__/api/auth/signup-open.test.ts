import { POST } from "@/app/api/auth/signup/route";
import * as email from "@/src/lib/email";
import { prisma } from "@/src/lib/prisma";

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    emailVerificationToken: { create: jest.fn() },
  },
}));

jest.mock("@/src/lib/email", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

// bcrypt is slow in tests — mock it
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

const mockCreatedUser = {
  id: "user_1",
  email: "test@example.com",
  name: "Test User",
  role: "viewer",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/signup (open signup)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates user with role 'viewer'", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);
    (prisma.emailVerificationToken.create as jest.Mock).mockResolvedValue({
      id: "tok_1",
    });

    const res = await POST(
      makeRequest({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
    );

    expect(res.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "viewer" }),
      }),
    );
  });

  it("returns 409 on duplicate email", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCreatedUser);

    const res = await POST(
      makeRequest({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.code).toBe("EMAIL_TAKEN");
  });

  it("calls sendWelcomeEmail after signup", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);
    (prisma.emailVerificationToken.create as jest.Mock).mockResolvedValue({
      id: "tok_1",
    });

    await POST(
      makeRequest({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
    );

    // Fire-and-forget — give the microtask a tick
    await Promise.resolve();
    expect(email.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: mockCreatedUser.email }),
    );
  });

  it("calls sendVerificationEmail after signup", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);
    (prisma.emailVerificationToken.create as jest.Mock).mockResolvedValue({
      id: "tok_1",
    });

    await POST(
      makeRequest({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
    );

    await Promise.resolve();
    expect(email.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: mockCreatedUser.email }),
    );
  });

  it("returns 400 when fields are missing", async () => {
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(
      makeRequest({
        name: "Test",
        email: "test@example.com",
        password: "short",
      }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe("PASSWORD_TOO_SHORT");
  });

  it("creates an email verification token", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);
    (prisma.emailVerificationToken.create as jest.Mock).mockResolvedValue({
      id: "tok_1",
    });

    await POST(
      makeRequest({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      }),
    );

    expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: mockCreatedUser.id }),
      }),
    );
  });
});
