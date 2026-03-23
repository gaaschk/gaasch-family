import { GET } from "@/app/api/trees/[treeId]/descendants/route";
import { prisma } from "@/src/lib/prisma";

const mockAuth = {
  userId: "user_1",
  email: "test@example.com",
  treeRole: "viewer" as const,
  tree: { id: "tree_1", slug: "my-family", name: "My Family" },
};

jest.mock("@/src/lib/prisma", () => ({
  prisma: {
    person: { findFirst: jest.fn() },
    family: { findMany: jest.fn() },
  },
}));

jest.mock("@/src/lib/auth", () => ({
  requireTreeAccess: jest.fn(),
}));

import { requireTreeAccess } from "@/src/lib/auth";

const mockRequireTreeAccess = requireTreeAccess as jest.Mock;

const mockPrisma = prisma as {
  person: { findFirst: jest.Mock };
  family: { findMany: jest.Mock };
};

function makeRequest(treeId: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/trees/${treeId}/descendants`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString());
}

async function callGET(req: Request, treeId: string): Promise<Response> {
  return GET(req as never, { params: Promise.resolve({ treeId }) });
}

beforeEach(() => {
  jest.resetAllMocks();
  mockRequireTreeAccess.mockResolvedValue(mockAuth);
});

describe("GET /api/trees/[treeId]/descendants", () => {
  it("returns 400 when rootPersonId is missing", async () => {
    const req = makeRequest("tree_1");
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/rootPersonId/i);
  });

  it("returns 404 when person not found", async () => {
    mockPrisma.person.findFirst.mockResolvedValue(null);
    const req = makeRequest("tree_1", { rootPersonId: "person_99" });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("returns children: [] when person has no families", async () => {
    mockPrisma.person.findFirst.mockResolvedValue({
      id: "person_1",
      firstName: "Alice",
      lastName: "Smith",
      birthDate: null,
      deathDate: null,
      gender: "F",
    });
    mockPrisma.family.findMany.mockResolvedValue([]);

    const req = makeRequest("tree_1", {
      rootPersonId: "person_1",
      generations: "1",
    });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.root.id).toBe("person_1");
    expect(body.root.children).toEqual([]);
  });

  it("returns children populated for one family", async () => {
    const root = {
      id: "person_1",
      firstName: "Alice",
      lastName: "Smith",
      birthDate: null,
      deathDate: null,
      gender: "F",
    };
    const child1 = {
      id: "person_10",
      firstName: "Charlie",
      lastName: "Smith",
      birthDate: null,
      deathDate: null,
      gender: "M",
    };

    mockPrisma.person.findFirst
      .mockResolvedValueOnce(root)
      .mockResolvedValueOnce(child1);

    // First call: root's families (has one child)
    // Second call: child1's families (empty — depth reached)
    mockPrisma.family.findMany
      .mockResolvedValueOnce([
        { id: "fam_1", children: [{ personId: "person_10" }] },
      ])
      .mockResolvedValueOnce([]);

    const req = makeRequest("tree_1", {
      rootPersonId: "person_1",
      generations: "1",
    });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.root.children).toHaveLength(1);
    expect(body.root.children[0].id).toBe("person_10");
  });

  it("respects cross-tenant guard — person from different tree is not found", async () => {
    mockPrisma.person.findFirst.mockResolvedValue(null);
    const req = makeRequest("tree_1", { rootPersonId: "person_other_tree" });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(404);
    expect(mockPrisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ treeId: "tree_1" }),
      }),
    );
  });

  it("depth=0 returns leaf with children: []", async () => {
    mockPrisma.person.findFirst.mockResolvedValue({
      id: "person_1",
      firstName: "Alice",
      lastName: null,
      birthDate: null,
      deathDate: null,
      gender: null,
    });
    // At depth=0 (generations="0" clamps to 1 via Math.max(1, rawGen)),
    // the route still calls family.findMany once but finds no families.
    mockPrisma.family.findMany.mockResolvedValue([]);

    const req = makeRequest("tree_1", {
      rootPersonId: "person_1",
      generations: "0",
    });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.root.children).toEqual([]);
  });
});
