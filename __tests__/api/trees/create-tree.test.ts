import { POST } from "@/app/api/trees/route";
import { prisma } from "@/src/lib/prisma";

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    tree: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/src/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: "user_1", email: "test@example.com", role: "viewer" },
  }),
}));

const mockTree = {
  id: "tree_1",
  slug: "my-family",
  name: "My Family",
  description: null,
  ownerId: "user_1",
  _count: { people: 0, members: 1 },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/trees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/trees", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates tree with owner as TreeMember admin", async () => {
    (prisma.tree.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        tree: {
          create: jest
            .fn()
            .mockResolvedValue({ id: "tree_1", slug: "my-family" }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockTree),
        },
        treeMember: {
          create: jest.fn().mockResolvedValue({
            treeId: "tree_1",
            userId: "user_1",
            role: "admin",
          }),
        },
      };
      const result = await fn(tx);
      // Verify TreeMember was created with admin role
      expect(tx.treeMember.create).toHaveBeenCalledWith({
        data: { treeId: "tree_1", userId: "user_1", role: "admin" },
      });
      return result;
    });

    const res = await POST(makeRequest({ name: "My Family" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe("my-family");
    expect(body._count.members).toBe(1);
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("MISSING_FIELDS");
  });

  it("appends timestamp suffix for duplicate slug", async () => {
    (prisma.tree.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        tree: {
          create: jest.fn().mockImplementation(({ data }) => {
            expect(data.slug).toMatch(/^my-family-[a-z0-9]+$/);
            return { id: "tree_2", slug: data.slug };
          }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockTree,
            id: "tree_2",
            slug: "my-family-abc123",
          }),
        },
        treeMember: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    const res = await POST(makeRequest({ name: "My Family" }));
    expect(res.status).toBe(201);
  });
});
