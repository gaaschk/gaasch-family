import { requireTreeAccess } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    tree: { findFirst: jest.fn() },
    treeMember: { findUnique: jest.fn() },
  },
}));

jest.mock("@/src/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/src/auth";

const mockTree = {
  id: "tree_1",
  slug: "gaasch-family",
  name: "The Gaasch Family",
  ownerId: "user_owner",
};

describe("requireTreeAccess", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await requireTreeAccess("gaasch-family", "viewer");
    const body = await (result as Response).json();
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 404 when tree not found", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user_1", email: "a@b.com", role: "viewer" },
    });
    (prisma.tree.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await requireTreeAccess("nonexistent", "viewer");
    const body = await (result as Response).json();
    expect(body.code).toBe("TREE_NOT_FOUND");
  });

  it("grants admin access to tree owner without TreeMember row", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user_owner", email: "owner@b.com", role: "viewer" },
    });
    (prisma.tree.findFirst as jest.Mock).mockResolvedValue(mockTree);

    const result = await requireTreeAccess("gaasch-family", "viewer");
    expect(result).toEqual({
      userId: "user_owner",
      email: "owner@b.com",
      treeRole: "admin",
      tree: mockTree,
    });
    // Should NOT have queried TreeMember
    expect(prisma.treeMember.findUnique).not.toHaveBeenCalled();
  });

  it("grants access to platform admin regardless of membership", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user_admin", email: "admin@b.com", role: "admin" },
    });
    (prisma.tree.findFirst as jest.Mock).mockResolvedValue(mockTree);

    const result = await requireTreeAccess("gaasch-family", "viewer");
    expect(result).toEqual({
      userId: "user_admin",
      email: "admin@b.com",
      treeRole: "admin",
      tree: mockTree,
    });
    expect(prisma.treeMember.findUnique).not.toHaveBeenCalled();
  });

  it("checks TreeMember for non-owner, non-admin users", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user_member", email: "member@b.com", role: "viewer" },
    });
    (prisma.tree.findFirst as jest.Mock).mockResolvedValue(mockTree);
    (prisma.treeMember.findUnique as jest.Mock).mockResolvedValue({
      treeId: "tree_1",
      userId: "user_member",
      role: "editor",
    });

    const result = await requireTreeAccess("gaasch-family", "viewer");
    expect(result).toEqual({
      userId: "user_member",
      email: "member@b.com",
      treeRole: "editor",
      tree: mockTree,
    });
  });

  it("returns 403 for non-member, non-owner user", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user_stranger", email: "stranger@b.com", role: "viewer" },
    });
    (prisma.tree.findFirst as jest.Mock).mockResolvedValue(mockTree);
    (prisma.treeMember.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await requireTreeAccess("gaasch-family", "viewer");
    const body = await (result as Response).json();
    expect(body.code).toBe("NOT_A_MEMBER");
  });

  it("returns 403 when member role is below minimum", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user_member", email: "member@b.com", role: "viewer" },
    });
    (prisma.tree.findFirst as jest.Mock).mockResolvedValue(mockTree);
    (prisma.treeMember.findUnique as jest.Mock).mockResolvedValue({
      treeId: "tree_1",
      userId: "user_member",
      role: "viewer",
    });

    const result = await requireTreeAccess("gaasch-family", "admin");
    const body = await (result as Response).json();
    expect(body.code).toBe("INSUFFICIENT_TREE_ROLE");
  });
});
