import { getMountSourceBucket } from "@/lib/mountSourceBucket";
import type { Mount } from "@/types/mount";

/**
 * Epic K.6 — heuristic “raid-style” mount for deprioritization learning.
 * Uses catalog `source` text, `tags`, and hard **drop** + difficulty.
 */
export function mountLooksRaidHeavy(mount: Mount): boolean {
  const src = (mount.source || "").toLowerCase();
  if (src.includes("raid")) return true;
  const tags = Array.isArray(mount.tags) ? mount.tags : [];
  if (tags.some((t) => String(t).toLowerCase() === "raid")) return true;
  if (getMountSourceBucket(mount) === "drop" && mount.difficulty >= 4) {
    return true;
  }
  return false;
}
