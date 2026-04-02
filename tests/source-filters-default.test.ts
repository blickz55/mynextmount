import { describe, expect, it } from "vitest";
import {
  initialSourceFiltersAllOn,
  initialSourceFiltersDefault,
} from "@/lib/mountSourceBucket";

describe("initialSourceFiltersDefault", () => {
  it("leaves petstore, promotion, and marksofhonor off; other buckets match all-on", () => {
    const d = initialSourceFiltersDefault();
    const all = initialSourceFiltersAllOn();
    expect(d.petstore).toBe(false);
    expect(d.promotion).toBe(false);
    expect(d.marksofhonor).toBe(false);
    for (const id of Object.keys(all) as (keyof typeof all)[]) {
      if (id === "petstore" || id === "promotion" || id === "marksofhonor")
        continue;
      expect(d[id]).toBe(all[id]);
    }
  });
});
