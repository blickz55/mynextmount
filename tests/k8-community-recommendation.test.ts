import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import { parseCommunityBoostBySpellIdJson } from "@/lib/clientFarmScoringPersonalization";
import { scoreForRecommendationMode } from "@/lib/scoring";
import {
  applyK8CommunityBoostToScore,
  getCommunityRecommendationBoost,
  K8_COMMUNITY_BOOST_MAX,
  recommendationBoostFromPersistedAggregate,
} from "@/lib/scoring/k8CommunityRecommendation";
import type { Mount } from "@/types/mount";

const m = (catalogJson as Mount[])[0]!;

describe("recommendationBoostFromPersistedAggregate", () => {
  it("returns 0 for null or empty votes", () => {
    expect(recommendationBoostFromPersistedAggregate(null)).toBe(0);
    expect(
      recommendationBoostFromPersistedAggregate({
        communitySignalSchemaVersion: 1,
        voteCount: 0,
        sumValues: 5,
        listingHelpfulnessScore: 5,
      }),
    ).toBe(0);
  });

  it("boosts positive helpfulness and dampens with tanh", () => {
    const b = recommendationBoostFromPersistedAggregate({
      communitySignalSchemaVersion: 1,
      voteCount: 3,
      sumValues: 3,
      listingHelpfulnessScore: 3,
    });
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThanOrEqual(K8_COMMUNITY_BOOST_MAX);
  });

  it("reduces score for negative sums", () => {
    const b = recommendationBoostFromPersistedAggregate({
      communitySignalSchemaVersion: 1,
      voteCount: 2,
      sumValues: -2,
      listingHelpfulnessScore: -2,
    });
    expect(b).toBeLessThan(0);
    expect(b).toBeGreaterThanOrEqual(-K8_COMMUNITY_BOOST_MAX);
  });

  it("ignores unknown schema version", () => {
    expect(
      recommendationBoostFromPersistedAggregate({
        communitySignalSchemaVersion: 99,
        voteCount: 10,
        sumValues: 10,
        listingHelpfulnessScore: 10,
      }),
    ).toBe(0);
  });
});

describe("getCommunityRecommendationBoost", () => {
  it("looks up precomputed map", () => {
    expect(getCommunityRecommendationBoost(m.id, { [m.id]: 0.02 })).toBe(0.02);
    expect(getCommunityRecommendationBoost(m.id, undefined)).toBe(0);
    expect(getCommunityRecommendationBoost(999999991, { [m.id]: 0.02 })).toBe(
      0,
    );
  });
});

describe("applyK8CommunityBoostToScore", () => {
  it("adds boost from personalization", () => {
    const base = 0.5;
    const next = applyK8CommunityBoostToScore(m, base, {
      communityBoostBySpellId: { [m.id]: 0.02 },
    });
    expect(next).toBeCloseTo(0.52, 5);
  });
});

describe("scoreForRecommendationMode + K.8", () => {
  it("raises efficient score when community boost is positive", () => {
    const plain = scoreForRecommendationMode(m, "efficient").score;
    const boosted = scoreForRecommendationMode(m, "efficient", {
      personalization: {
        communityBoostBySpellId: { [m.id]: K8_COMMUNITY_BOOST_MAX },
      },
    }).score;
    expect(boosted).toBeGreaterThan(plain);
  });
});

describe("parseCommunityBoostBySpellIdJson", () => {
  it("parses string keys", () => {
    expect(parseCommunityBoostBySpellIdJson({ "12": 0.01, "x": 1 })).toEqual({
      12: 0.01,
    });
  });
});
