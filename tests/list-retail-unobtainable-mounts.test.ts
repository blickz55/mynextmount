import { describe, expect, it } from "vitest";

import { listRetailUnobtainableMounts } from "@/lib/listRetailUnobtainableMounts";
import type { Mount } from "@/types/mount";

function m(partial: Partial<Mount> & Pick<Mount, "id" | "name">): Mount {
  return {
    source: "",
    location: "",
    dropRate: 0,
    difficulty: 0,
    timeToComplete: 0,
    lockout: "none",
    expansion: "",
    tags: [],
    ...partial,
  };
}

describe("listRetailUnobtainableMounts", () => {
  it("returns only retailObtainable === false, sorted by name then id", () => {
    const catalog: Mount[] = [
      m({
        id: 2,
        name: "Zebra",
        retailObtainable: true,
      }),
      m({
        id: 10,
        name: "Alpha",
        retailObtainable: false,
      }),
      m({
        id: 5,
        name: "Alpha",
        retailObtainable: false,
      }),
      m({
        id: 3,
        name: "Beta",
        retailObtainable: false,
      }),
    ];
    const got = listRetailUnobtainableMounts(catalog);
    expect(got.map((x) => x.id)).toEqual([5, 10, 3]);
  });

  it("treats omitted retailObtainable as obtainable", () => {
    const catalog: Mount[] = [
      m({ id: 1, name: "A" }),
      m({ id: 2, name: "B", retailObtainable: false }),
    ];
    expect(listRetailUnobtainableMounts(catalog).map((x) => x.id)).toEqual([2]);
  });
});
