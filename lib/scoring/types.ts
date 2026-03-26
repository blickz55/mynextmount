import type { Mount } from "@/types/mount";

/** Normalized inputs in [0, 1] unless noted. */
export type FactorVector = {
  easeFromDifficulty: number;
  /** Log-scaled “good drop odds” (high = forgiving RNG). */
  dropLogProspect: number;
  /** Linear drop rate in [0, 1] (same as catalog field, clamped). */
  dropLinear: number;
  /** 1 − dropLinear — high when the mount is statistically scarce. */
  dropScarcity: number;
  /** High when runs are short (time-efficient). */
  timeEfficiency: number;
  /** `difficulty / 5` — higher = harder content (used by legacy rarest). */
  difficultyIntensity: number;
  /** 1 if `tags` contains `rare`, else 0. */
  rareTagBonus: number;
  /** High when more attempts fit a week (lockout bandwidth). */
  lockoutFlex: number;
  /** Heuristic solo / friction from `sourceCategory`. */
  accessibility: number;
  /** Trophy value: scarcity + difficulty + rare tag. */
  prestige: number;
  /**
   * Economic throughput proxy: (p × attempts/week) / hours per attempt, squashed to [0, 1].
   * Not a literal drop chance — see `docs/scoring-model.md`.
   */
  evThroughput: number;
  /** Placeholder 0.5 until account progress exists (Epic J.7). */
  progressProximity: number;
};

export type CompositeFactorKey = keyof FactorVector;

export type CompositeWeights = Partial<Record<CompositeFactorKey, number>>;

export type MountScoreResult = {
  score: number;
  factors: FactorVector;
  /** Non-zero weights only — each `weighted[k] = weight * factors[k]`. */
  weighted: Partial<Record<CompositeFactorKey, number>>;
  /** Top positive contributors, human-readable. */
  reasons: string[];
  /** Profile id for telemetry / debugging. */
  profileId: string;
};

export type ScoringContext = {
  /**
   * Optional: ratio of mounts in same expansion (or global) collected [0,1].
   * When absent, `progressProximity` stays neutral.
   */
  completionByExpansion?: Record<string, number>;
};

export type ScoreMountFn = (mount: Mount) => number;
