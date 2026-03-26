import type { Mount } from "@/types/mount";

import { scoreRarestDetailed } from "@/lib/scoring/composite";

/**
 * Rarest mode: higher score = rarer / harder to obtain.
 * `(1 - dropRate)*0.6 + (difficulty/5)*0.2 + (has "rare" tag ? 1 : 0)*0.2`
 * — implemented via `scoreRarestDetailed` so the composite engine stays canonical.
 */
export function scoreRarest(mount: Mount): number {
  return scoreRarestDetailed(mount).score;
}
