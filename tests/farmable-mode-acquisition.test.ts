import { describe, expect, it } from "vitest";
import { mountPassesFarmableModeAcquisition } from "@/lib/mountSourceBucket";
import type { Mount } from "@/types/mount";

function stubMount(partial: Partial<Mount>): Mount {
  return {
    id: 1,
    name: "Test",
    source: "DROP — Drop",
    location: "Somewhere",
    dropRate: 0.05,
    difficulty: 2,
    timeToComplete: 30,
    lockout: "weekly",
    expansion: "Test",
    tags: [],
    ...partial,
  };
}

describe("mountPassesFarmableModeAcquisition", () => {
  it("allows drop and vendor buckets", () => {
    expect(
      mountPassesFarmableModeAcquisition(
        stubMount({ sourceCategory: "drop" }),
      ),
    ).toBe(true);
    expect(
      mountPassesFarmableModeAcquisition(
        stubMount({ sourceCategory: "vendor", source: "VENDOR — Vendor" }),
      ),
    ).toBe(true);
  });

  it("rejects quest, achievement, profession, and similar buckets", () => {
    const rows: Partial<Mount>[] = [
      { sourceCategory: "quest", source: "QUEST — Quest" },
      { sourceCategory: "achievement", source: "ACHIEVEMENT — Achievement" },
      { sourceCategory: "profession", source: "PROFESSION — Profession" },
      { sourceCategory: "petstore", source: "PETSTORE — Shop" },
      { sourceCategory: "tradingpost", source: "TRADINGPOST — Trading Post" },
      { sourceCategory: "promotion", source: "PROMOTION — Promo" },
      { sourceCategory: "tcg", source: "TCG — Card" },
      { sourceCategory: "worldevent", source: "WORLDEVENT — Event" },
      { sourceCategory: "discovery", source: "DISCOVERY — Secret" },
      { source: "RETAIL — Uncategorized" },
    ];
    for (const partial of rows) {
      expect(mountPassesFarmableModeAcquisition(stubMount(partial))).toBe(
        false,
      );
    }
  });
});
