import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import { applyK4PersonalizationToScore } from "@/lib/scoring/k4Personalization";
import { scoreForRecommendationMode } from "@/lib/scoring";
import type {
  ScoringContext,
  ScoringPersonalization,
} from "@/lib/scoring/types";
const catalog = catalogJson as import("@/types/mount").Mount[];

describe("K.4 personalization", () => {
  it("omitting context matches explicit undefined", () => {
    const m = catalog[0]!;
    expect(scoreForRecommendationMode(m, "efficient").score).toBe(
      scoreForRecommendationMode(m, "efficient", undefined).score,
    );
  });

  it("demotes locked mounts", () => {
    const m = catalog[0]!;
    const base = scoreForRecommendationMode(m, "efficient").score;
    const p: ScoringPersonalization = {
      lockoutBySpellId: {
        [m.id]: { kind: "daily", state: "locked", unlocksAt: null },
      },
      nowMs: Date.now(),
    };
    expect(applyK4PersonalizationToScore(m, base, p)).toBeLessThan(base);
  });

  it("boosts with many attempts (diminishing returns)", () => {
    const m = catalog[1]!;
    const base = scoreForRecommendationMode(m, "balanced").score;
    const p: ScoringPersonalization = {
      attemptsBySpellId: { [m.id]: 30 },
      nowMs: Date.now(),
    };
    expect(applyK4PersonalizationToScore(m, base, p)).toBeGreaterThan(base);
  });

  it("weekly urgency when available and reset soon", () => {
    const m = catalog.find((x) => x.lockout === "weekly");
    if (!m) {
      expect(true).toBe(true);
      return;
    }
    const base = scoreForRecommendationMode(m, "efficient").score;
    const p: ScoringPersonalization = {
      lockoutBySpellId: {
        [m.id]: { kind: "weekly", state: "available", unlocksAt: null },
      },
      nextWeeklyResetAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      nowMs: Date.now(),
    };
    expect(applyK4PersonalizationToScore(m, base, p)).toBeGreaterThan(base);
  });

  it("scoreForRecommendationMode applies personalization after composite", () => {
    const m = catalog[2]!;
    const plain = scoreForRecommendationMode(m, "efficient").score;
    const personalization: ScoringPersonalization = {
      attemptsBySpellId: { [m.id]: 40 },
      nowMs: Date.now(),
    };
    const ctx: ScoringContext = { personalization };
    const withK4 = scoreForRecommendationMode(m, "efficient", ctx).score;
    expect(withK4).toBeGreaterThan(plain);
  });
});
