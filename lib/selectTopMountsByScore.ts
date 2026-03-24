import type { Mount } from "@/types/mount";

const DEFAULT_LIMIT = 10;

/**
 * Full list sorted by `scoreMount` descending (for infinite scroll / slicing client-side).
 */
export function sortMountsByScore(
  mounts: readonly Mount[],
  scoreMount: (m: Mount) => number,
): Mount[] {
  const scored = mounts.map((mount) => ({
    mount,
    score: scoreMount(mount),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ mount }) => mount);
}

/**
 * Sorts by `scoreMount` descending and returns at most `limit` mounts (default 10).
 */
export function selectTopMountsByScore(
  mounts: readonly Mount[],
  scoreMount: (m: Mount) => number,
  limit: number = DEFAULT_LIMIT,
): Mount[] {
  const capped = Math.max(0, limit);
  return sortMountsByScore(mounts, scoreMount).slice(0, capped);
}
