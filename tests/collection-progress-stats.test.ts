import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import { computeCollectionProgressStats } from "@/lib/collectionProgressStats";
import type { Mount } from "@/types/mount";

const catalog = catalogJson as Mount[];

describe("computeCollectionProgressStats", () => {
  it("counts obtainable and matches", () => {
    const retail = catalog.filter((m) => m.retailObtainable !== false);
    const ids = retail.slice(0, 2).map((m) => m.id);
    const s = computeCollectionProgressStats(ids, catalog);
    expect(s.obtainableTotal).toBe(retail.length);
    expect(s.matchedObtainable).toBe(2);
    expect(s.storedSpellCount).toBe(2);
    expect(s.percentComplete).toBeGreaterThan(0);
  });

  it("flags unknown spell IDs", () => {
    const s = computeCollectionProgressStats([999999991, 999999992], catalog);
    expect(s.matchedObtainable).toBe(0);
    expect(s.unknownSpellIdCount).toBe(2);
  });

  it("excludes unobtainable from denominator", () => {
    const s = computeCollectionProgressStats([], catalog);
    const unobtainable = catalog.filter((m) => m.retailObtainable === false);
    expect(s.obtainableTotal).toBe(catalog.length - unobtainable.length);
  });
});
