export {
  attemptsPerWeek,
  accessibilityFromCategory,
  clamp,
  computeFactorVector,
  dropLogProspect,
  evThroughputNormalized,
} from "./factors";
export {
  recommendationScorer,
  scoreForRecommendationMode,
  scoreMountComposite,
  scoreRarestDetailed,
} from "./composite";
export { PROFILE_BALANCED, PROFILE_EFFICIENT, PROFILE_LEGACY_RAREST } from "./profiles";
export { recommendationScoreToAcquisitionBandLabel } from "./acquisitionBand";
export type { AcquisitionBandLabel } from "./acquisitionBand";
export { spearmanRho } from "./stats";
export type {
  CompositeFactorKey,
  CompositeWeights,
  FactorVector,
  FarmBehaviorSignals,
  MountScoreResult,
  ScoreMountFn,
  ScoringContext,
  ScoringPersonalization,
} from "./types";
