import type { Mount } from "@/types/mount";

/**
 * Epic K.7 — progress vs **obtainable** Retail catalog mounts (`retailObtainable !== false`).
 */
export type CollectionProgressStats = {
  /** Spell IDs in the export (unique, sorted as from {@link deserializeSpellIds}). */
  storedSpellCount: number;
  /** Mount rows in catalog counted as obtainable in Retail. */
  obtainableTotal: number;
  /** Obtainable catalog mounts whose spell ID appears in the export. */
  matchedObtainable: number;
  /** `matchedObtainable / obtainableTotal` as percent, one decimal. */
  percentComplete: number;
  /** Export IDs that do not match any obtainable catalog row (stubs, typos, legacy). */
  unknownSpellIdCount: number;
};

export function computeCollectionProgressStats(
  ownedSpellIds: readonly number[],
  catalog: readonly Mount[],
): CollectionProgressStats {
  const obtainable = catalog.filter((m) => m.retailObtainable !== false);
  const obtainableSet = new Set(obtainable.map((m) => m.id));
  const ownedSet = new Set(ownedSpellIds);

  let matchedObtainable = 0;
  for (const m of obtainable) {
    if (ownedSet.has(m.id)) matchedObtainable++;
  }

  let unknownSpellIdCount = 0;
  for (const id of ownedSet) {
    if (!obtainableSet.has(id)) unknownSpellIdCount++;
  }

  const obtainableTotal = obtainable.length;
  const percentComplete =
    obtainableTotal > 0
      ? Math.round((matchedObtainable / obtainableTotal) * 1000) / 10
      : 0;

  return {
    storedSpellCount: ownedSpellIds.length,
    obtainableTotal,
    matchedObtainable,
    percentComplete,
    unknownSpellIdCount,
  };
}
