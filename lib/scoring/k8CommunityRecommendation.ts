import type { Mount } from "@/types/mount";

import type { ScoringPersonalization } from "./types";

/** v1 persisted row shape (matches `MountListingCommunityAggregate`). */
export type PersistedCommunitySignalV1 = {
  communitySignalSchemaVersion: number;
  voteCount: number;
  sumValues: number;
  listingHelpfulnessScore: number;
};

/** Tunable: larger → same vote sum moves the needle less. */
export const K8_COMMUNITY_TANH_SCALE = 6;

/** Max absolute additive change to the [0,1]-ish composite score (modest nudge). */
export const K8_COMMUNITY_BOOST_MAX = 0.035;

const SCHEMA_V1 = 1;

/**
 * Map DB aggregate → additive score delta. v1 uses `listingHelpfulnessScore` = `sumValues`
 * over `MountListingVote.value` (+1 / −1).
 */
export function recommendationBoostFromPersistedAggregate(
  row: PersistedCommunitySignalV1 | null,
): number {
  if (!row || row.voteCount <= 0) return 0;
  if (row.communitySignalSchemaVersion !== SCHEMA_V1) return 0;
  const s = row.listingHelpfulnessScore;
  return Math.max(
    -K8_COMMUNITY_BOOST_MAX,
    Math.min(
      K8_COMMUNITY_BOOST_MAX,
      Math.tanh(s / K8_COMMUNITY_TANH_SCALE) * K8_COMMUNITY_BOOST_MAX,
    ),
  );
}

/**
 * Thin adapter: read precomputed boosts (batch-loaded on the server / in farm-attempts).
 * K.8.2 swaps implementation by changing how the map is built, not call sites.
 */
export function getCommunityRecommendationBoost(
  spellId: number,
  bySpellId: Readonly<Record<number, number>> | undefined,
): number {
  if (!bySpellId) return 0;
  const v = bySpellId[spellId];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function applyK8CommunityBoostToScore(
  mount: Mount,
  score: number,
  personalization?: ScoringPersonalization,
): number {
  const boost = getCommunityRecommendationBoost(
    mount.id,
    personalization?.communityBoostBySpellId,
  );
  return score + boost;
}
