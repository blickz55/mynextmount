import type { Mount } from "@/types/mount";

/**
 * Mounts the catalog treats as not obtainable in current Retail (`retailObtainable === false`).
 * Populated from merged `data/mounts.json` (overrides such as `retail-unobtainable.json`).
 */
export function listRetailUnobtainableMounts(
  catalog: readonly Mount[],
): Mount[] {
  return catalog
    .filter((m) => m.retailObtainable === false)
    .slice()
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      if (byName !== 0) return byName;
      return a.id - b.id;
    });
}
