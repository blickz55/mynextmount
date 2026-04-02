import { describe, expect, it } from "vitest";
import {
  initialSourceFiltersAllOn,
  initialSourceFiltersDefault,
  mountPassesSourceFilters,
  mountQuickStepsMentionHalaa,
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

describe("mountQuickStepsMentionHalaa", () => {
  it("is true when a digest line mentions Halaa", () => {
    const m = baseMount({
      wowheadCommentDigest: [
        "Buy from Trader Narasu after capturing Halaa.",
      ],
    });
    expect(mountQuickStepsMentionHalaa(m)).toBe(true);
  });

  it("matches case-insensitively", () => {
    const m = baseMount({
      wowheadCommentDigest: ["Farm HALAA battle tokens in Nagrand"],
    });
    expect(mountQuickStepsMentionHalaa(m)).toBe(true);
  });

  it("is true when guide checklist mentions Halaa", () => {
    const m = baseMount({
      guide: {
        overview: "Vendor mount.",
        checklist: ["Earn Halaa Battle Tokens from PvP objectives"],
        sourceUrl: "https://example.com",
        sourceLabel: "x",
      },
    });
    expect(mountQuickStepsMentionHalaa(m)).toBe(true);
  });

  it("is false when no quick-step or guide text mentions Halaa", () => {
    const m = baseMount({
      wowheadCommentDigest: ["Buy with gold in Orgrimmar"],
    });
    expect(mountQuickStepsMentionHalaa(m)).toBe(false);
  });
});

describe("mountPassesSourceFilters + halaa", () => {
  const halaaMount = baseMount({
    id: 2,
    wowheadCommentDigest: ["Costs Halaa Battle Tokens"],
  });
  const plainVendor = baseMount({
    id: 3,
    wowheadCommentDigest: ["Buy with gold"],
  });

  it("hides Halaa mounts when halaa is off (default)", () => {
    const f = initialSourceFiltersDefault();
    expect(mountPassesSourceFilters(halaaMount, f)).toBe(false);
    expect(mountPassesSourceFilters(plainVendor, f)).toBe(true);
  });

  it("shows Halaa mounts when halaa is on", () => {
    const f = initialSourceFiltersAllOn();
    expect(mountPassesSourceFilters(halaaMount, f)).toBe(true);
  });
});
