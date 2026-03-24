import type { Mount } from "@/types/mount";

/**
 * Rarest mode: higher score = rarer / harder to obtain.
 * (1 - dropRate)*0.6 + (difficulty/5)*0.2 + (has "rare" tag ? 1 : 0)*0.2
 */
export function scoreRarest(mount: Mount): number {
  const rareBonus = mount.tags.includes("rare") ? 1 : 0;
  return (
    (1 - mount.dropRate) * 0.6 +
    (mount.difficulty / 5) * 0.2 +
    rareBonus * 0.2
  );
}
