import { describe, expect, it } from "vitest";
import {
  initialSourceFiltersAllOn,
  initialSourceFiltersDefault,
} from "@/lib/mountSourceBucket";

describe("initialSourceFiltersDefault", () => {
  it("leaves in-game shop (petstore) off; other buckets match all-on", () => {
    const d = initialSourceFiltersDefault();
    const all = initialSourceFiltersAllOn();
    expect(d.petstore).toBe(false);
    for (const id of Object.keys(all) as (keyof typeof all)[]) {
      if (id === "petstore") continue;
      expect(d[id]).toBe(all[id]);
    }
  });
});
