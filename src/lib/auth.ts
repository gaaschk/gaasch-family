import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { prisma } from "@/src/lib/prisma";

type PlatformRole = "pending" | "viewer" | "editor" | "admin";
type TreeRole = "viewer" | "editor" | "admin";

const PLATFORM_ROLE_ORDER: Record<string, number> = {
  pending: -1,
  viewer: 0,
  editor: 1,
  admin: 2,
};

const TREE_ROLE_ORDER: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export function apiError(
  code: string,
  error: string,
  details?: unknown,
  status = 400,
) {
  return NextResponse.json({ error, code, details }, { status });
}

export async function requireRole(minRole: PlatformRole = "viewer") {
  const session = await auth();
  if (!session?.user) {
    return apiError(
      "UNAUTHENTICATED",
      "Authentication required",
      undefined,
      401,
    );
  }
  const role = (session.user as { role?: string }).role ?? "pending";
  if (PLATFORM_ROLE_ORDER[role] < PLATFORM_ROLE_ORDER[minRole]) {
    return apiError(
      "INSUFFICIENT_ROLE",
      "Insufficient platform role",
      undefined,
      403,
    );
  }
  // biome-ignore lint/style/noNonNullAssertion: session.user.id and email are always set after auth
  return { userId: session.user.id!, email: session.user.email!, role };
}

export async function requireTreeAccess(
  treeIdOrSlug: string,
  minRole: TreeRole = "viewer",
) {
  const session = await auth();
  if (!session?.user) {
    return apiError(
      "UNAUTHENTICATED",
      "Authentication required",
      undefined,
      401,
    );
  }

  // biome-ignore lint/style/noNonNullAssertion: session.user.id is always set after auth
  const userId = session.user.id!;
  const userPlatformRole =
    (session.user as { role?: string }).role ?? "pending";

  const tree = await prisma.tree.findFirst({
    where: { OR: [{ id: treeIdOrSlug }, { slug: treeIdOrSlug }] },
  });

  if (!tree) {
    return apiError("TREE_NOT_FOUND", "Tree not found", undefined, 404);
  }

  // Platform admins have full tree access
  if (userPlatformRole === "admin") {
    return {
      userId,
      // biome-ignore lint/style/noNonNullAssertion: session.user.email is always set after auth
      email: session.user.email!,
      treeRole: "admin" as TreeRole,
      tree,
    };
  }

  // Tree owner has full admin access
  if (tree.ownerId === userId) {
    return {
      userId,
      // biome-ignore lint/style/noNonNullAssertion: session.user.email is always set after auth
      email: session.user.email!,
      treeRole: "admin" as TreeRole,
      tree,
    };
  }

  // Check tree membership
  const member = await prisma.treeMember.findUnique({
    where: { treeId_userId: { treeId: tree.id, userId } },
  });

  if (!member) {
    return apiError(
      "NOT_A_MEMBER",
      "Not a member of this tree",
      undefined,
      403,
    );
  }

  if (TREE_ROLE_ORDER[member.role] < TREE_ROLE_ORDER[minRole]) {
    return apiError(
      "INSUFFICIENT_TREE_ROLE",
      "Insufficient tree role",
      undefined,
      403,
    );
  }

  return {
    userId,
    // biome-ignore lint/style/noNonNullAssertion: session.user.email is always set after auth
    email: session.user.email!,
    treeRole: member.role as TreeRole,
    tree,
  };
}

export async function requireTreeAccessOrToken(
  req: Request,
  treeIdOrSlug: string,
  minRole: TreeRole = "viewer",
) {
  // Check Bearer token first
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const tree = await prisma.tree.findFirst({
      where: { OR: [{ id: treeIdOrSlug }, { slug: treeIdOrSlug }] },
    });
    if (tree) {
      const setting = await prisma.setting.findUnique({
        where: { treeId_key: { treeId: tree.id, key: "api_token" } },
      });
      if (setting?.value === token) {
        return {
          userId: "api",
          email: "api",
          treeRole: "editor" as TreeRole,
          tree,
        };
      }
    }
  }
  return requireTreeAccess(treeIdOrSlug, minRole);
}
