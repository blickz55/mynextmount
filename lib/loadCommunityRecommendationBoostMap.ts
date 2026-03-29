import type { PrismaClient } from "@prisma/client";

import { recommendationBoostFromPersistedAggregate } from "@/lib/scoring/k8CommunityRecommendation";

/**
 * Batch-load K.8 boosts for farm-list spell IDs (same math as `recommendationBoostFromPersistedAggregate`).
 */
export async function loadCommunityRecommendationBoostMap(
  prisma: PrismaClient,
  spellIds: readonly number[],
): Promise<Record<number, number>> {
  if (spellIds.length === 0) return {};
  const unique = [...new Set(spellIds.filter((x) => Number.isFinite(x) && x > 0))];
  if (unique.length === 0) return {};
  const rows = await prisma.mountListingCommunityAggregate.findMany({
    where: { spellId: { in: unique } },
  });
  const out: Record<number, number> = {};
  for (const r of rows) {
    out[r.spellId] = recommendationBoostFromPersistedAggregate(r);
  }
  return out;
}
