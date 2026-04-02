import { describe, expect, it } from "vitest";
import { recommendationScoreToAcquisitionBandLabel } from "@/lib/scoring/acquisitionBand";

describe("recommendationScoreToAcquisitionBandLabel", () => {
  it("returns — for non-finite scores", () => {
    expect(recommendationScoreToAcquisitionBandLabel(NaN, true)).toBe("—");
    expect(recommendationScoreToAcquisitionBandLabel(Infinity, false)).toBe("—");
  });

  it("when higherMeansRarer, low scores map to Very Common and high to Extremely Rare", () => {
    expect(recommendationScoreToAcquisitionBandLabel(0, true)).toBe("Very Common");
    expect(recommendationScoreToAcquisitionBandLabel(0.05, true)).toBe("Very Common");
    expect(recommendationScoreToAcquisitionBandLabel(1, true)).toBe("Extremely Rare");
    expect(recommendationScoreToAcquisitionBandLabel(0.95, true)).toBe("Extremely Rare");
  });

  it("when higherMeansRarer is false, low scores map to Extremely Rare and high to Very Common", () => {
    expect(recommendationScoreToAcquisitionBandLabel(0, false)).toBe("Extremely Rare");
    expect(recommendationScoreToAcquisitionBandLabel(0.05, false)).toBe("Extremely Rare");
    expect(recommendationScoreToAcquisitionBandLabel(1, false)).toBe("Very Common");
    expect(recommendationScoreToAcquisitionBandLabel(0.9185, false)).toBe("Very Common");
  });

  it("uses six equal bands on [0, 1)", () => {
    expect(recommendationScoreToAcquisitionBandLabel(0.16, false)).toBe("Extremely Rare");
    expect(recommendationScoreToAcquisitionBandLabel(0.17, false)).toBe("Very Rare");
    expect(recommendationScoreToAcquisitionBandLabel(1 / 3, false)).toBe("Rare");
    expect(recommendationScoreToAcquisitionBandLabel(0.5, false)).toBe("Uncommon");
    expect(recommendationScoreToAcquisitionBandLabel(2 / 3, false)).toBe("Common");
    expect(recommendationScoreToAcquisitionBandLabel(5 / 6 - 0.001, false)).toBe("Common");
    expect(recommendationScoreToAcquisitionBandLabel(5 / 6, false)).toBe("Very Common");
  });

  it("clamps out-of-range scores", () => {
    expect(recommendationScoreToAcquisitionBandLabel(-1, false)).toBe("Extremely Rare");
    expect(recommendationScoreToAcquisitionBandLabel(2, false)).toBe("Very Common");
  });
});
