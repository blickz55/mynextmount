import { describe, expect, it } from "vitest";
import {
  buildGuideExperienceReport,
  digestComplete,
  farmTipPresent,
  guideComplete,
} from "@/lib/guideExperienceCoverage";

describe("guideExperienceCoverage helpers", () => {
  it("guideComplete requires overview, checklist item, sourceUrl", () => {
    const empty = {};
    expect(guideComplete(empty, 1)).toBe(false);
    expect(
      guideComplete(
        {
          guides: {
            "1": {
              overview: "x",
              checklist: ["a"],
              sourceUrl: "https://a",
            },
          },
        },
        1,
      ),
    ).toBe(true);
  });

  it("digestComplete accepts flavor or lines", () => {
    expect(digestComplete({}, 1)).toBe(false);
    expect(digestComplete({ "1": { flavor: " hi " } }, 1)).toBe(true);
    expect(digestComplete({ "1": { lines: ["", "x"] } }, 1)).toBe(true);
  });

  it("farmTipPresent", () => {
    expect(farmTipPresent({}, 1)).toBe(false);
    expect(farmTipPresent({ "1": "tip" }, 1)).toBe(true);
  });
});

describe("buildGuideExperienceReport", () => {
  it("computes percentOfWowheadUrl for rich panel", () => {
    const mounts = [
      { id: 1, wowheadUrl: "https://w.com/m=1" },
      { id: 2, wowheadUrl: "https://w.com/m=2" },
      { id: 3 },
    ];
    const guides = {
      guides: {
        "1": { overview: "a", checklist: ["x"], sourceUrl: "u" },
        "2": { overview: "b", checklist: ["y"], sourceUrl: "v" },
        "3": { overview: "c", checklist: ["z"], sourceUrl: "w" },
      },
    };
    const digests = {
      "1": { flavor: "f" },
    };
    const tips = { "1": "why" };
    const r = buildGuideExperienceReport(mounts, guides, digests, tips, {
      sampleLimit: 5,
    });
    expect(r.schemaVersion).toBe(2);
    expect(r.counts.withWowheadUrl).toBe(2);
    expect(r.counts.richPanelGuideAndDigest).toBe(1);
    expect(r.percentOfWowheadUrl.richPanelGuideAndDigest).toBe(50);
    expect(r.counts.fullExperienceGuideDigestFarmTip).toBe(1);
    expect(r.percentOfWowheadUrl.fullExperienceGuideDigestFarmTip).toBe(50);
    expect(r.samples.missingRichPanelAmongWowheadSpellIds).toContain(2);
  });
});
