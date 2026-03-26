import type { CompositeWeights } from "./types";

/** Recommended default weights (sum to 1 per profile). */
export const PROFILE_EFFICIENT: CompositeWeights = {
  evThroughput: 0.55,
  timeEfficiency: 0.17,
  lockoutFlex: 0.18,
  easeFromDifficulty: 0.05,
  accessibility: 0.05,
};

export const PROFILE_BALANCED: CompositeWeights = {
  easeFromDifficulty: 0.14,
  dropLogProspect: 0.14,
  timeEfficiency: 0.18,
  lockoutFlex: 0.14,
  accessibility: 0.14,
  prestige: 0.12,
  evThroughput: 0.14,
};

/** Same linear combination as `lib/scoreRarest.ts`. */
export const PROFILE_LEGACY_RAREST: CompositeWeights = {
  dropScarcity: 0.6,
  difficultyIntensity: 0.2,
  rareTagBonus: 0.2,
};
