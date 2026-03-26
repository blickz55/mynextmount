import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import { scoreEasiest } from "@/lib/scoreEasiest";
import { scoreRarest } from "@/lib/scoreRarest";
import {
  computeFactorVector,
  PROFILE_LEGACY_RAREST,
  scoreMountComposite,
  scoreRarestDetailed,
  scoreForRecommendationMode,
} from "@/lib/scoring";
import type { Mount } from "@/types/mount";

const catalog = catalogJson as Mount[];

describe("composite scoring", () => {
  it("scoreRarest matches PROFILE_LEGACY_RAREST dot product", () => {
    for (const m of catalog) {
      const a = scoreRarest(m);
      const b = scoreMountComposite(m, PROFILE_LEGACY_RAREST, "x").score;
      expect(Math.abs(a - b)).toBeLessThan(1e-12);
      expect(scoreRarestDetailed(m).score).toBe(a);
    }
  });

  it("scoreEasiest unchanged vs hand formula (G.1 fixture)", () => {
    const m = catalog[2]!;
    const minutes = Math.max(m.timeToComplete, 1);
    const expected =
      (1 - m.difficulty / 5) * 0.5 +
      m.dropRate * 0.3 +
      (1 / minutes) * 0.2;
    expect(scoreEasiest(m)).toBeCloseTo(expected, 12);
  });

  it("efficient and balanced return finite scores with reasons", () => {
    const m = catalog[3]!;
    const e = scoreForRecommendationMode(m, "efficient");
    const b = scoreForRecommendationMode(m, "balanced");
    expect(Number.isFinite(e.score)).toBe(true);
    expect(Number.isFinite(b.score)).toBe(true);
    expect(e.reasons.length).toBeGreaterThan(0);
    expect(b.reasons.length).toBeGreaterThan(0);
  });

  it("factor vector components stay in [0, 1]", () => {
    const m = catalog[4]!;
    const f = computeFactorVector(m);
    for (const v of Object.values(f)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
