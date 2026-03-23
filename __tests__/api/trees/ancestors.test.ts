import { GET } from "@/app/api/trees/[treeId]/ancestors/route";
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
    familyChild: { findFirst: jest.fn() },
  },
}));

jest.mock("@/src/lib/auth", () => ({
  requireTreeAccess: jest.fn(),
}));

import { requireTreeAccess } from "@/src/lib/auth";

const mockRequireTreeAccess = requireTreeAccess as jest.Mock;

const mockPrisma = prisma as {
  person: { findFirst: jest.Mock };
  familyChild: { findFirst: jest.Mock };
};

function makeRequest(treeId: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/trees/${treeId}/ancestors`);
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

describe("GET /api/trees/[treeId]/ancestors", () => {
  it("returns 400 when rootPersonId is missing", async () => {
    const req = makeRequest("tree_1");
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/rootPersonId/i);
  });

  it("returns 404 when person not found in tree", async () => {
    mockPrisma.person.findFirst.mockResolvedValue(null);
    const req = makeRequest("tree_1", { rootPersonId: "person_99" });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(404);
  });

  it("returns root with null father and mother when person has no FamilyChild", async () => {
    mockPrisma.person.findFirst.mockResolvedValue({
      id: "person_1",
      firstName: "Alice",
      lastName: "Smith",
      birthDate: "1980-01-01",
      deathDate: null,
      gender: "F",
    });
    mockPrisma.familyChild.findFirst.mockResolvedValue(null);

    const req = makeRequest("tree_1", {
      rootPersonId: "person_1",
      generations: "1",
    });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.root.id).toBe("person_1");
    expect(body.root.father).toBeNull();
    expect(body.root.mother).toBeNull();
  });

  it("returns root with father and mother populated at depth=1", async () => {
    const rootPerson = {
      id: "person_1",
      firstName: "Alice",
      lastName: "Smith",
      birthDate: null,
      deathDate: null,
      gender: "F",
    };
    const father = {
      id: "person_2",
      firstName: "Bob",
      lastName: "Smith",
      birthDate: null,
      deathDate: null,
      gender: "M",
    };
    const mother = {
      id: "person_3",
      firstName: "Carol",
      lastName: "Smith",
      birthDate: null,
      deathDate: null,
      gender: "F",
    };

    mockPrisma.person.findFirst
      .mockResolvedValueOnce(rootPerson) // root lookup
      .mockResolvedValueOnce(father) // father lookup
      .mockResolvedValueOnce(mother); // mother lookup

    mockPrisma.familyChild.findFirst
      .mockResolvedValueOnce({
        family: { husbandId: "person_2", wifeId: "person_3" },
      }) // root's family
      .mockResolvedValueOnce(null) // father has no parents
      .mockResolvedValueOnce(null); // mother has no parents

    const req = makeRequest("tree_1", {
      rootPersonId: "person_1",
      generations: "1",
    });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.root.father?.id).toBe("person_2");
    expect(body.root.mother?.id).toBe("person_3");
  });

  it("respects cross-tenant guard — findFirst called with correct treeId", async () => {
    mockPrisma.person.findFirst.mockResolvedValue(null);
    const req = makeRequest("tree_1", { rootPersonId: "person_cross_tenant" });
    await callGET(req, "tree_1");
    expect(mockPrisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ treeId: "tree_1" }),
      }),
    );
  });

  it("clamps generations to max 6 — does not throw for generations=99", async () => {
    mockPrisma.person.findFirst.mockResolvedValue({
      id: "person_1",
      firstName: "Alice",
      lastName: null,
      birthDate: null,
      deathDate: null,
      gender: null,
    });
    mockPrisma.familyChild.findFirst.mockResolvedValue(null);

    const req = makeRequest("tree_1", {
      rootPersonId: "person_1",
      generations: "99",
    });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(200);
  });

  it("returns null father when Family.husbandId is null", async () => {
    const rootPerson = {
      id: "person_1",
      firstName: "Alice",
      lastName: null,
      birthDate: null,
      deathDate: null,
      gender: "F",
    };
    const mother = {
      id: "person_3",
      firstName: "Carol",
      lastName: null,
      birthDate: null,
      deathDate: null,
      gender: "F",
    };

    mockPrisma.person.findFirst
      .mockResolvedValueOnce(rootPerson)
      .mockResolvedValueOnce(mother);

    mockPrisma.familyChild.findFirst
      .mockResolvedValueOnce({
        family: { husbandId: null, wifeId: "person_3" },
      })
      .mockResolvedValueOnce(null); // mother has no parents

    const req = makeRequest("tree_1", {
      rootPersonId: "person_1",
      generations: "1",
    });
    const res = await callGET(req, "tree_1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.root.father).toBeNull();
    expect(body.root.mother?.id).toBe("person_3");
  });
});
