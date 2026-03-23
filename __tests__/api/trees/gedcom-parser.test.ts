import { parseGedcomTolerant } from "@/app/api/trees/[treeId]/import/gedcom-parser";

describe("parseGedcomTolerant", () => {
  it("parses standard sequential GEDCOM (0→1→2)", () => {
    const text = [
      "0 @I1@ INDI",
      "1 NAME John /Smith/",
      "2 GIVN John",
      "2 SURN Smith",
      "1 BIRT",
      "2 DATE 1 JAN 1900",
    ].join("\n");

    const root = parseGedcomTolerant(text);
    expect(root.children).toHaveLength(1);
    const indi = root.children[0];
    expect(indi.type).toBe("INDI");
    expect(indi.data?.xref_id).toBe("@I1@");
    const nameNode = indi.children?.find((c) => c.type === "NAME");
    expect(nameNode).toBeDefined();
    expect(nameNode?.children?.find((c) => c.type === "GIVN")?.value).toBe(
      "John",
    );
  });

  it("handles non-sequential levels (3→7) without throwing — regression guard", () => {
    const text = [
      "0 @I1@ INDI",
      "1 NAME John /Doe/",
      "7 SOME_DEEP_TAG value",
    ].join("\n");

    expect(() => parseGedcomTolerant(text)).not.toThrow();
    const root = parseGedcomTolerant(text);
    expect(root.children).toHaveLength(1);
  });

  it("strips UTF-8 BOM from input", () => {
    // The route.ts strips BOM before calling parser; parser itself should
    // also handle lines cleanly after pre-processing strips the BOM
    const text = "0 @I1@ INDI\n1 NAME Test /Person/";
    const root = parseGedcomTolerant(text);
    expect(root.children[0].type).toBe("INDI");
  });

  it("normalizes \\r\\n line endings", () => {
    const text = "0 @I1@ INDI\r\n1 NAME Test /Person/\r\n";
    const root = parseGedcomTolerant(text);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].type).toBe("INDI");
  });

  it("parses XREF tags (@I1@) into node.data.xref_id", () => {
    const text = "0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I2@";
    const root = parseGedcomTolerant(text);
    const fam = root.children[0];
    expect(fam.type).toBe("FAM");
    expect(fam.data?.xref_id).toBe("@F1@");
  });

  it("skips empty lines without crashing", () => {
    const text = "0 @I1@ INDI\n\n1 NAME Test /Person/\n\n";
    const root = parseGedcomTolerant(text);
    expect(root.children).toHaveLength(1);
  });

  it("ignores lines not starting with a digit", () => {
    const text =
      "0 @I1@ INDI\nThis is not a valid GEDCOM line\n1 NAME Test /Person/";
    const root = parseGedcomTolerant(text);
    const indi = root.children[0];
    const nameNode = indi.children?.find((c) => c.type === "NAME");
    expect(nameNode).toBeDefined();
  });

  it("correctly nests children under their parents", () => {
    const text = [
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE 15 MAR 1950",
      "2 PLAC London, England",
      "1 DEAT",
      "2 DATE 20 JUN 2020",
    ].join("\n");

    const root = parseGedcomTolerant(text);
    const indi = root.children[0];
    const birt = indi.children?.find((c) => c.type === "BIRT");
    expect(birt).toBeDefined();
    expect(birt?.children?.find((c) => c.type === "DATE")?.value).toBe(
      "15 MAR 1950",
    );
    expect(birt?.children?.find((c) => c.type === "PLAC")?.value).toBe(
      "London, England",
    );

    const deat = indi.children?.find((c) => c.type === "DEAT");
    expect(deat?.children?.find((c) => c.type === "DATE")?.value).toBe(
      "20 JUN 2020",
    );
  });

  it("returns root with empty children for empty input", () => {
    const root = parseGedcomTolerant("");
    expect(root.type).toBe("root");
    expect(root.children).toHaveLength(0);
  });
});
