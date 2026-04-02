import { describe, expect, it } from "vitest";
import {
  normalizeReputationLookupKey,
  parseRequiresExaltedReputationNames,
  reputationFarmUrlForDisplayName,
} from "@/lib/reputationExaltedQuickStep";

describe("normalizeReputationLookupKey", () => {
  it("strips apostrophes and normalizes case", () => {
    expect(normalizeReputationLookupKey("Sha'tari Skyguard")).toBe(
      "shatari skyguard",
    );
  });
});

describe("parseRequiresExaltedReputationNames", () => {
  it("parses a single reputation before a period", () => {
    expect(parseRequiresExaltedReputationNames("Sha'tari Skyguard")).toEqual([
      "Sha'tari Skyguard",
    ]);
  });

  it("stops at comma for unless clause", () => {
    expect(
      parseRequiresExaltedReputationNames(
        "Ironforge, unless you're a dwarf.",
      ),
    ).toEqual(["Ironforge"]);
  });

  it("stops at or for race alternative", () => {
    expect(
      parseRequiresExaltedReputationNames("Darkspear Trolls or Troll character."),
    ).toEqual(["Darkspear Trolls"]);
  });

  it("captures dual reputations joined by or", () => {
    expect(
      parseRequiresExaltedReputationNames("Tushui or Huojin Pandaren"),
    ).toEqual(["Tushui", "Huojin Pandaren"]);
  });

  it("does not split on or when followed by Exalted with", () => {
    expect(
      parseRequiresExaltedReputationNames(
        "Silvermoon or Exalted with Exodar on other chars.",
      ),
    ).toEqual(["Silvermoon"]);
  });

  it("handles leading the", () => {
    expect(parseRequiresExaltedReputationNames("the Kirin Tor.")).toEqual([
      "Kirin Tor",
    ]);
  });

  it("parses reputation before period for Reach Exalted lines", () => {
    expect(
      parseRequiresExaltedReputationNames("Sha'tari Skyguard."),
    ).toEqual(["Sha'tari Skyguard"]);
  });
});

describe("reputationFarmUrlForDisplayName", () => {
  it("resolves Sha'tari Skyguard to Wowhead", () => {
    const u = reputationFarmUrlForDisplayName("Sha'tari Skyguard");
    expect(u).toBeTruthy();
    expect(u).toContain("wowhead.com");
    expect(u).toContain("1031");
  });

  it("returns null for vague pandaren placeholder", () => {
    expect(reputationFarmUrlForDisplayName("your Pandaren faction")).toBeNull();
  });
});
