import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

import { computeFactorVector } from "./factors";
import {
  PROFILE_BALANCED,
  PROFILE_EFFICIENT,
  PROFILE_LEGACY_RAREST,
} from "./profiles";
import type {
  CompositeFactorKey,
  CompositeWeights,
  MountScoreResult,
  ScoringContext,
} from "./types";

/** Plain-language hints for the score breakdown (shown under “Score” on farm cards). */
const REASON_LABEL: Record<CompositeFactorKey, string> = {
  easeFromDifficulty: "Easier content—we weight low difficulty here",
  dropLogProspect: "Drop odds look friendlier than the worst ultra-rares",
  dropLinear: "Listed drop rate helps this row",
  dropScarcity: "Very rare on paper (low listed drop chance)",
  timeEfficiency: "Runs are relatively short per attempt",
  difficultyIntensity: "Hooked to harder content (prestige)",
  rareTagBonus: "Tagged as a rare spawn or rare drop in our data",
  lockoutFlex: "You can try often—not stuck on a single weekly lockout",
  accessibility: "Straightforward source (vendor, quest, shop, event, etc.)",
  prestige: "Feels like a trophy (scarce, tough, or rare-tagged)",
  evThroughput:
    "Good mix of drop chance, time per run, and tries you can fit in a week",
  progressProximity:
    "Lines up with how complete you are in this expansion (when we know it)",
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
    return `${label} (~${clamped}% of this recommendation score).`;
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
    result.reasons.push("Rarity ranking vs other missing mounts.");
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
  switch (mode) {
    case "efficient":
      return scoreMountComposite(
        mount,
        PROFILE_EFFICIENT,
        "efficient",
        ctx,
      );
    case "balanced":
      return scoreMountComposite(mount, PROFILE_BALANCED, "balanced", ctx);
    case "rarest":
      return scoreRarestDetailed(mount);
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function recommendationScorer(
  mode: RecommendationMode,
  ctx?: ScoringContext,
): (mount: Mount) => number {
  return (mount) => scoreForRecommendationMode(mount, mode, ctx).score;
}
