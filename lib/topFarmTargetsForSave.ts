import { filterMountsByFarmSearchQuery } from "@/lib/farmListSearch";
import { filterUnownedMounts } from "@/lib/filterUnownedMounts";
import { K_ATTEMPT_INCREMENT_CAP } from "@/lib/farmAttemptConstants";
import { filterMountsEligibleForFarmRecommendations } from "@/lib/mountFarmEligibility";
import {
  anySourceFilterEnabled,
  getMountSourceBucket,
  initialSourceFiltersDefault,
  SOURCE_FILTER_OPTIONS,
  type SourceBucketId,
} from "@/lib/mountSourceBucket";
import { mounts } from "@/lib/mounts";
import { recommendationScorer } from "@/lib/scoring";
import { sortMountsByScore } from "@/lib/selectTopMountsByScore";
import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

const BUCKET_IDS = SOURCE_FILTER_OPTIONS.map((o) => o.id) as SourceBucketId[];

export function parseRecommendationModeForSave(raw: unknown): RecommendationMode {
  if (raw === "efficient" || raw === "balanced" || raw === "rarest") return raw;
  return "efficient";
}

/** Merge client filter toggles onto defaults (invalid keys ignored). */
export function normalizeSourceFiltersForSave(input: unknown): Record<
  SourceBucketId,
  boolean
> {
  const base = initialSourceFiltersDefault();
  if (input === null || typeof input !== "object") return base;
  const o = input as Record<string, unknown>;
  for (const id of BUCKET_IDS) {
    const v = o[id];
    if (typeof v === "boolean") base[id] = v;
  }
  return base;
}

/**
 * Same pipeline as `/tool` farm list (minus infinite scroll / K.4): unowned → eligible →
 * source filters → score sort → optional farm search. Caller may re-sort with
 * {@link recommendationScorer}`(mode, { personalization })` for signed-in parity (Epic K.4).
 */
export function farmTargetRankingMounts(
  ownedSpellIds: readonly number[],
  mode: RecommendationMode,
  sourceFilters: Record<SourceBucketId, boolean>,
  farmSearchQuery: string,
): Mount[] {
  if (!anySourceFilterEnabled(sourceFilters)) return [];
  const unowned = filterUnownedMounts(mounts as readonly Mount[], ownedSpellIds);
  const farmable = filterMountsEligibleForFarmRecommendations(unowned);
  const filtered = farmable.filter((m) => sourceFilters[getMountSourceBucket(m)]);
  const scoreFn = recommendationScorer(mode);
  const sorted = sortMountsByScore(filtered, scoreFn);
  return filterMountsByFarmSearchQuery(sorted, farmSearchQuery);
}

/**
 * Top {@link K_ATTEMPT_INCREMENT_CAP} spell IDs — baseline scorer (no K.4). Use
 * {@link farmTargetRankingMounts} + server personalization on the signed-in save path.
 */
export function topSpellIdsForFarmAttempts(
  ownedSpellIds: readonly number[],
  mode: RecommendationMode,
  sourceFilters: Record<SourceBucketId, boolean>,
  farmSearchQuery: string,
): number[] {
  return farmTargetRankingMounts(
    ownedSpellIds,
    mode,
    sourceFilters,
    farmSearchQuery,
  )
    .slice(0, K_ATTEMPT_INCREMENT_CAP)
    .map((m) => m.id);
}
