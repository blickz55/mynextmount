import type { Mount } from "@/types/mount";

/**
 * Farm recommendations only include mounts we treat as still obtainable in Retail.
 * `retailObtainable === false` comes from curated `data/overrides/retail-unobtainable.json`
 * (merged at `npm run data:build` or `npm run data:apply-overrides`).
 */
export function isMountEligibleForFarmRecommendations(m: Mount): boolean {
  return m.retailObtainable !== false;
}

export function filterMountsEligibleForFarmRecommendations(
  mounts: readonly Mount[],
): Mount[] {
  return mounts.filter(isMountEligibleForFarmRecommendations);
}
