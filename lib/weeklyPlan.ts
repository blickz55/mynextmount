import { filterUnownedMounts } from "@/lib/filterUnownedMounts";
import { filterMountsEligibleForFarmRecommendations } from "@/lib/mountFarmEligibility";
import {
  initialSourceFiltersDefault,
  mountPassesSourceFilters,
} from "@/lib/mountSourceBucket";
import { recommendationScorer } from "@/lib/scoring";
import { sortMountsByScore } from "@/lib/selectTopMountsByScore";
import type { Mount } from "@/types/mount";

/**
 * J.7-d — deterministic “this week” shortlist: top N missing mounts by efficient score
 * with the same default source filters as `/tool`.
 */
export function computeWeeklyPlanMounts(
  catalog: readonly Mount[],
  ownedSpellIds: readonly number[],
  limit = 10,
): Mount[] {
  const filters = initialSourceFiltersDefault();
  const unowned = filterUnownedMounts([...catalog], ownedSpellIds);
  const farmable = filterMountsEligibleForFarmRecommendations(unowned);
  const filtered = farmable.filter((m) => mountPassesSourceFilters(m, filters));
  const scoreFn = recommendationScorer("efficient");
  return sortMountsByScore(filtered, scoreFn).slice(0, limit);
}
