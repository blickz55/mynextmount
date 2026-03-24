import type { Mount } from "@/types/mount";

/** Returns mounts whose `id` is not in `ownedIds`. */
export function filterUnownedMounts(
  allMounts: readonly Mount[],
  ownedIds: readonly number[],
): Mount[] {
  const owned = new Set(ownedIds);
  return allMounts.filter((m) => !owned.has(m.id));
}
