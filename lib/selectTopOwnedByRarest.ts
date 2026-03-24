import type { Mount } from "@/types/mount";
import { scoreRarest } from "@/lib/scoreRarest";
import { selectTopMountsByScore } from "@/lib/selectTopMountsByScore";

/** Among mounts both owned (spell IDs) and present in the dataset, top `limit` by rarest score. */
export function selectTopOwnedByRarest(
  allMounts: readonly Mount[],
  ownedSpellIds: readonly number[],
  limit = 10,
): Mount[] {
  const owned = new Set(ownedSpellIds);
  const ownedInDataset = allMounts.filter((m) => owned.has(m.id));
  return selectTopMountsByScore(ownedInDataset, scoreRarest, limit);
}
