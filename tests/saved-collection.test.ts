import { describe, expect, it } from "vitest";
import {
  deserializeSpellIds,
  MAX_SAVED_SPELL_IDS,
  serializeSpellIds,
} from "@/lib/savedCollection";

describe("serializeSpellIds", () => {
  it("dedupes, sorts, and joins without M: prefix", () => {
    expect(serializeSpellIds([3, 1, 3, 2])).toBe("1,2,3");
  });

  it("drops invalid and out-of-range values", () => {
    expect(serializeSpellIds([1, NaN, -1, 0, 2 ** 31, 10])).toBe("1,10");
  });

  it("returns empty string for empty input", () => {
    expect(serializeSpellIds([])).toBe("");
  });
});

describe("deserializeSpellIds", () => {
  it("parses comma list with whitespace", () => {
    expect(deserializeSpellIds(" 3 , 1 , 1 ")).toEqual([1, 3]);
  });

  it("returns empty array for empty or whitespace", () => {
    expect(deserializeSpellIds("")).toEqual([]);
    expect(deserializeSpellIds("  ")).toEqual([]);
  });
});

describe("round-trip", () => {
  it("matches after serialize → deserialize", () => {
    const ids = [9001, 42, 9001, 7];
    expect(deserializeSpellIds(serializeSpellIds(ids))).toEqual([7, 42, 9001]);
  });
});

describe("MAX_SAVED_SPELL_IDS", () => {
  it("is a reasonable upper bound for API validation", () => {
    expect(MAX_SAVED_SPELL_IDS).toBeGreaterThan(1000);
    expect(MAX_SAVED_SPELL_IDS).toBeLessThanOrEqual(50000);
  });
});
