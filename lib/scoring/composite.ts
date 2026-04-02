import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

import { computeFactorVector } from "./factors";
import {
  PROFILE_BALANCED,
  PROFILE_EFFICIENT,
  PROFILE_LEGACY_RAREST,
} from "./profiles";
import { applyK4PersonalizationToScore } from "./k4Personalization";
import { applyK6BehaviorPersonalizationToScore } from "./k6BehaviorPersonalization";
import { applyK8CommunityBoostToScore } from "./k8CommunityRecommendation";
import type {
  CompositeFactorKey,
  CompositeWeights,
  MountScoreResult,
  ScoringContext,
} from "./types";

/** Plain-language hints for the score breakdown (shown under “Score” on farm cards). */
const REASON_LABEL: Record<CompositeFactorKey, string> = {
  easeFromDifficulty: "Easier content",
  dropLogProspect: "Drop rate beats the worst ultra-rares",
  dropLinear: "Listed drop chance helps",
  dropScarcity: "Super low listed drop chance",
  timeEfficiency: "Short runs per try",
  difficultyIntensity: "Harder content (prestige)",
  rareTagBonus: "Marked as a rare spawn / drop",
  lockoutFlex: "Not stuck on one weekly lockout",
  accessibility: "Simple source (vendor, quest, shop, holiday, etc.)",
  prestige: "Trophy vibes — scarce, tough, or rare-tagged",
  evThroughput: "Nice mix of drop %, run time, and tries per week",
  progressProximity: "Fits how far along you are this expansion (when we know)",
};

function sumWeights(w: CompositeWeights): number {
  let s = 0;
  for (const v of Object.values(w)) {
    if (typeof v === "number" && Number.isFinite(v)) s += v;
  }
  return s;
}

function normalizeWeights(w: CompositeWeights): CompositeWeights {
  const s = sumWeights(w);
  if (s <= 0) return { ...PROFILE_BALANCED };
  const out: CompositeWeights = {};
  for (const [k, v] of Object.entries(w)) {
    if (typeof v === "number" && Number.isFinite(v) && v !== 0) {
      out[k as CompositeFactorKey] = v / s;
    }
  }
  return out;
}

function applyWeights(
  factors: MountScoreResult["factors"],
  weights: CompositeWeights,
): { score: number; weighted: Partial<Record<CompositeFactorKey, number>> } {
  const w = normalizeWeights(weights);
  const weighted: Partial<Record<CompositeFactorKey, number>> = {};
  let score = 0;
  for (const key of Object.keys(w) as CompositeFactorKey[]) {
    const wt = w[key];
    if (wt == null || wt === 0) continue;
    const f = factors[key];
    if (typeof f !== "number") continue;
    const part = wt * f;
    weighted[key] = part;
    score += part;
  }
  return { score, weighted };
}

function buildReasons(
  weighted: Partial<Record<CompositeFactorKey, number>>,
  totalScore: number,
  limit = 4,
): string[] {
  const entries = Object.entries(weighted)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort((a, b) => b[1]! - a[1]!)
    .slice(0, limit);
  return entries.map(([k, v]) => {
    const part = v as number;
    const label = REASON_LABEL[k as CompositeFactorKey] ?? String(k);
    if (!(totalScore > 1e-12)) return label;
    const pct = Math.round((100 * part) / totalScore);
    const clamped = Math.min(100, Math.max(1, pct));
    return `${label} (~${clamped}% of this card’s score).`;
  });
}

/** Exact legacy `scoreRarest` with explainable terms (same numeric result). */
export function scoreRarestDetailed(mount: Mount): MountScoreResult {
  const result = scoreMountComposite(
    mount,
    PROFILE_LEGACY_RAREST,
    "legacy_rarest",
  );
  if (result.reasons.length === 0) {
    result.reasons.push("Ranks rare vs the other mounts you’re missing.");
  }
  return result;
}

/**
 * Composite score for efficient / balanced modes. Weights sum to 1 after normalization.
 */
export function scoreMountComposite(
  mount: Mount,
  weights: CompositeWeights,
  profileId: string,
  ctx?: ScoringContext,
): MountScoreResult {
  const factors = computeFactorVector(mount, ctx);
  const { score, weighted } = applyWeights(factors, weights);
  return {
    score,
    factors,
    weighted,
    reasons: buildReasons(weighted, score),
    profileId,
  };
}

export function scoreForRecommendationMode(
  mount: Mount,
  mode: RecommendationMode,
  ctx?: ScoringContext,
): MountScoreResult {
  let result: MountScoreResult;
  switch (mode) {
    case "efficient":
      result = scoreMountComposite(
        mount,
        PROFILE_EFFICIENT,
        "efficient",
        ctx,
      );
      break;
    case "balanced":
      result = scoreMountComposite(mount, PROFILE_BALANCED, "balanced", ctx);
      break;
    case "rarest":
      result = scoreRarestDetailed(mount);
      break;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
  const afterK4 = applyK4PersonalizationToScore(
    mount,
    result.score,
    ctx?.personalization,
  );
  const afterK6 = applyK6BehaviorPersonalizationToScore(
    mount,
    afterK4,
    ctx?.personalization,
  );
  const score = applyK8CommunityBoostToScore(
    mount,
    afterK6,
    ctx?.personalization,
  );
  return { ...result, score };
}

export function recommendationScorer(
  mode: RecommendationMode,
  ctx?: ScoringContext,
): (mount: Mount) => number {
  return (mount) => scoreForRecommendationMode(mount, mode, ctx).score;
}
