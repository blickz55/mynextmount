import { describe, expect, it } from "vitest";
import {
  initialSourceFiltersAllOn,
  initialSourceFiltersDefault,
  mountPassesSourceFilters,
  mountQuickStepsMentionMarksOfHonor,
} from "@/lib/mountSourceBucket";
import type { Mount } from "@/types/mount";

function baseMount(partial: Partial<Mount>): Mount {
  return {
    id: 1,
    name: "Test",
    source: "VENDOR — Vendor",
    location: "x",
    dropRate: 1,
    difficulty: 1,
    timeToComplete: 1,
    lockout: "none",
    expansion: "x",
    tags: [],
    ...partial,
  };
}

describe("mountQuickStepsMentionMarksOfHonor", () => {
  it("is true when a digest line mentions Marks of Honor", () => {
    const m = baseMount({
      wowheadCommentDigest: ["Buy with Marks of Honor from the PvP vendor"],
    });
    expect(mountQuickStepsMentionMarksOfHonor(m)).toBe(true);
  });

  it("matches singular Mark of Honor", () => {
    const m = baseMount({
      wowheadCommentDigest: ["Costs one Mark of Honor"],
    });
    expect(mountQuickStepsMentionMarksOfHonor(m)).toBe(true);
  });

  it("is true when guide overview mentions it", () => {
    const m = baseMount({
      guide: {
        overview: "Farm Marks of Honor in battlegrounds, then visit the vendor.",
        checklist: ["Do a thing"],
        sourceUrl: "https://example.com",
        sourceLabel: "x",
      },
    });
    expect(mountQuickStepsMentionMarksOfHonor(m)).toBe(true);
  });

  it("is false when no quick-step or guide text mentions it", () => {
    const m = baseMount({
      wowheadCommentDigest: ["Gold vendor in Orgrimmar"],
    });
    expect(mountQuickStepsMentionMarksOfHonor(m)).toBe(false);
  });
});

describe("mountPassesSourceFilters + marksofhonor", () => {
  const mohMount = baseMount({
    id: 2,
    wowheadCommentDigest: ["Purchase with Marks of Honor"],
  });
  const plainVendor = baseMount({
    id: 3,
    wowheadCommentDigest: ["Buy with gold"],
  });

  it("hides MoH mounts when marksofhonor is off (default)", () => {
    const f = initialSourceFiltersDefault();
    expect(mountPassesSourceFilters(mohMount, f)).toBe(false);
    expect(mountPassesSourceFilters(plainVendor, f)).toBe(true);
  });

  it("shows MoH mounts when marksofhonor is on", () => {
    const f = initialSourceFiltersAllOn();
    expect(mountPassesSourceFilters(mohMount, f)).toBe(true);
  });
});
