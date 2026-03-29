import { describe, expect, it } from "vitest";

import { diffSpellIdSets } from "@/lib/collectionSnapshotDiff";

describe("diffSpellIdSets", () => {
  it("returns empty when identical", () => {
    const a = [1, 2, 3];
    expect(diffSpellIdSets(a, a)).toEqual({ added: [], removed: [] });
  });

  it("detects additions and removals", () => {
    expect(diffSpellIdSets([1, 3, 5], [1, 2, 3])).toEqual({
      added: [2],
      removed: [5],
    });
  });

  it("handles empty previous (all in next are additions algorithmically — caller may interpret as baseline)", () => {
    expect(diffSpellIdSets([], [10, 20])).toEqual({
      added: [10, 20],
      removed: [],
    });
  });

  it("handles empty next", () => {
    expect(diffSpellIdSets([7, 8], [])).toEqual({
      added: [],
      removed: [7, 8],
    });
  });

  it("handles both empty", () => {
    expect(diffSpellIdSets([], [])).toEqual({ added: [], removed: [] });
  });
});
