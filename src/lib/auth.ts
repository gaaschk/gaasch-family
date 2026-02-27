import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/types';

const ROLE_ORDER: Record<string, number> = {
  pending: -1,
  viewer:   0,
  editor:   1,
  admin:    2,
};

const TREE_ROLE_ORDER: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin:  2,
};

/**
 * Verifies the request has a valid Auth.js session and the user's platform role
 * meets or exceeds minRole.
 *
 * Returns `{ userId, email, role }` on success, or a NextResponse (401/403) on failure.
 */
export async function requireRole(
  minRole: UserRole,
): Promise<{ userId: string; email: string; role: UserRole } | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (ROLE_ORDER[user.role] < ROLE_ORDER[minRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id, email: user.email, role: user.role as UserRole };
}

/**
 * Like requireRole, but also accepts an `Authorization: Bearer <token>` header
 * validated against the `api_token` setting in the database.
 *
 * On valid token, returns `{ userId: 'api', email: 'api-token', role: 'editor' }`.
 */
export async function requireRoleOrToken(
  req: Request,
  minRole: UserRole,
): Promise<{ userId: string; email: string; role: UserRole } | NextResponse> {
  // Try session first
  const sessionResult = await requireRole(minRole);
  if (!(sessionResult instanceof NextResponse)) return sessionResult;

  // Fall back to Bearer token (checks any api_token setting)
  const bearer = req.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ')) return sessionResult;

  const token = bearer.slice(7).trim();
  const setting = await prisma.setting.findFirst({ where: { key: 'api_token' } });

  if (!setting?.value || setting.value !== token) {
    return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
  }

  if (ROLE_ORDER['editor'] < ROLE_ORDER[minRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: 'api', email: 'api-token', role: 'editor' };
}

/**
 * Checks that the authenticated user has access to the given tree with at
 * least `minTreeRole` level.
 *
 * Resolution order:
 *   1. Tree owner → always "admin"
 *   2. TreeMember row → use that row's role
 *   3. No membership → 403
 *
 * The `treeIdOrSlug` parameter may be either a tree UUID or the tree's slug.
 *
 * Returns `{ userId, email, treeRole, tree }` on success, or a NextResponse.
 */
export async function requireTreeAccess(
  treeIdOrSlug: string,
  minTreeRole: 'viewer' | 'editor' | 'admin',
): Promise<
  | { userId: string; email: string; treeRole: string; tree: { id: string; slug: string; name: string; ownerId: string } }
  | NextResponse
> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Resolve tree by id or slug
  const tree = await prisma.tree.findFirst({
    where: { OR: [{ id: treeIdOrSlug }, { slug: treeIdOrSlug }] },
    select: { id: true, slug: true, name: true, ownerId: true },
  });

  if (!tree) {
    return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
  }

  // Determine effective tree role
  let treeRole: string;
  if (tree.ownerId === user.id) {
    treeRole = 'admin';
  } else {
    const member = await prisma.treeMember.findUnique({
      where: { treeId_userId: { treeId: tree.id, userId: user.id } },
    });
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    treeRole = member.role;
  }

  if (TREE_ROLE_ORDER[treeRole] < TREE_ROLE_ORDER[minTreeRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id, email: user.email, treeRole, tree };
}

/**
 * Like requireTreeAccess, but also accepts a Bearer token matched against
 * the tree's `api_token` setting.
 */
export async function requireTreeAccessOrToken(
  req: Request,
  treeIdOrSlug: string,
  minTreeRole: 'viewer' | 'editor' | 'admin',
): Promise<
  | { userId: string; email: string; treeRole: string; tree: { id: string; slug: string; name: string; ownerId: string } }
  | NextResponse
> {
  const sessionResult = await requireTreeAccess(treeIdOrSlug, minTreeRole);
  if (!(sessionResult instanceof NextResponse)) return sessionResult;

  // Fall back to Bearer token
  const bearer = req.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ')) return sessionResult;

  const token = bearer.slice(7).trim();

  // Resolve tree
  const tree = await prisma.tree.findFirst({
    where: { OR: [{ id: treeIdOrSlug }, { slug: treeIdOrSlug }] },
    select: { id: true, slug: true, name: true, ownerId: true },
  });

  if (!tree) {
    return NextResponse.json({ error: 'Tree not found' }, { status: 404 });
  }

  const apiTokenSetting = await prisma.setting.findFirst({
    where: { treeId: tree.id, key: 'api_token' },
  });

  if (!apiTokenSetting?.value || apiTokenSetting.value !== token) {
    return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
  }

  if (TREE_ROLE_ORDER['editor'] < TREE_ROLE_ORDER[minTreeRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: 'api', email: 'api-token', treeRole: 'editor', tree };
}
