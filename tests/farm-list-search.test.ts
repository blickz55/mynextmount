import { describe, expect, it } from "vitest";
import {
  filterMountsByFarmSearchQuery,
  mountMatchesFarmSearchQuery,
} from "@/lib/farmListSearch";

const sample = [
  { id: 100001, name: "G1 Fixture — easiest bias" },
  { id: 100002, name: "G1 Fixture — rarest bias" },
  { id: 65645, name: "Winged Steed of the Ebon Blade" },
];

describe("mountMatchesFarmSearchQuery", () => {
  it("treats empty / whitespace as match-all", () => {
    expect(mountMatchesFarmSearchQuery(sample[0]!, "")).toBe(true);
    expect(mountMatchesFarmSearchQuery(sample[0]!, "   ")).toBe(true);
  });

  it("matches name case-insensitively", () => {
    expect(mountMatchesFarmSearchQuery(sample[0]!, "easiest")).toBe(true);
    expect(mountMatchesFarmSearchQuery(sample[0]!, "EASIEST")).toBe(true);
    expect(mountMatchesFarmSearchQuery(sample[0]!, "fixture")).toBe(true);
    expect(mountMatchesFarmSearchQuery(sample[0]!, "nomatch")).toBe(false);
  });

  it("matches exact spell id when query is all digits", () => {
    expect(mountMatchesFarmSearchQuery(sample[2]!, "65645")).toBe(true);
    expect(mountMatchesFarmSearchQuery(sample[0]!, "65645")).toBe(false);
  });
});

describe("filterMountsByFarmSearchQuery", () => {
  it("returns full list when query empty", () => {
    expect(filterMountsByFarmSearchQuery(sample, "")).toEqual(sample);
  });

  it("narrows by substring", () => {
    const r = filterMountsByFarmSearchQuery(sample, "rarest");
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe(100002);
  });
});
