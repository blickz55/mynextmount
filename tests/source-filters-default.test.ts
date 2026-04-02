import { describe, expect, it } from "vitest";
import {
  initialSourceFiltersAllOn,
  initialSourceFiltersDefault,
  SOURCE_FILTER_OPT_IN_OFF_BY_DEFAULT,
} from "@/lib/mountSourceBucket";

describe("initialSourceFiltersDefault", () => {
  it("leaves opt-in buckets off; other buckets match all-on", () => {
    const d = initialSourceFiltersDefault();
    const all = initialSourceFiltersAllOn();
    const off = new Set(SOURCE_FILTER_OPT_IN_OFF_BY_DEFAULT);
    for (const id of SOURCE_FILTER_OPT_IN_OFF_BY_DEFAULT) {
      expect(d[id]).toBe(false);
    }
    for (const id of Object.keys(all) as (keyof typeof all)[]) {
      if (off.has(id)) continue;
      expect(d[id]).toBe(all[id]);
    }
  });
});
