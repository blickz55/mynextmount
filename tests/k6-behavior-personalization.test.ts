import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import { scoreForRecommendationMode } from "@/lib/scoring";
import { applyK6BehaviorPersonalizationToScore } from "@/lib/scoring/k6BehaviorPersonalization";
import type { ScoringPersonalization } from "@/lib/scoring/types";
import type { Mount } from "@/types/mount";

const catalog = catalogJson as Mount[];

describe("applyK6BehaviorPersonalizationToScore", () => {
  it("no behavior leaves score unchanged", () => {
    const m = catalog[0]!;
    const base = 0.5;
    expect(applyK6BehaviorPersonalizationToScore(m, base, undefined)).toBe(base);
    expect(
      applyK6BehaviorPersonalizationToScore(m, base, { behavior: undefined }),
    ).toBe(base);
  });

  it("boosts short runs when user prefers short", () => {
    const m = catalog[0]!; // 10 min
    const base = 0.4;
    const p: ScoringPersonalization = {
      behavior: { preferShortRunsStrength: 1, raidAvoidanceStrength: 0 },
    };
    expect(applyK6BehaviorPersonalizationToScore(m, base, p)).toBeGreaterThan(
      base,
    );
  });

  it("demotes raid-heavy when avoidance is high", () => {
    const m = catalog[1]!; // hard weekly drop
    const base = 0.8;
    const p: ScoringPersonalization = {
      behavior: { preferShortRunsStrength: 0, raidAvoidanceStrength: 1 },
    };
    expect(applyK6BehaviorPersonalizationToScore(m, base, p)).toBeLessThan(
      base,
    );
  });

  it("scoreForRecommendationMode chains K6 after baseline", () => {
    const m = catalog[0]!;
    const plain = scoreForRecommendationMode(m, "efficient").score;
    const ctx = {
      personalization: {
        behavior: {
          preferShortRunsStrength: 0.9,
          raidAvoidanceStrength: 0,
        },
      } satisfies ScoringPersonalization,
    };
    expect(scoreForRecommendationMode(m, "efficient", ctx).score).toBeGreaterThan(
      plain,
    );
  });
});
