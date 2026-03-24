import type { Mount } from "@/types/mount";

/**
 * Easiest mode: higher score = easier to obtain.
 * (1 - difficulty/5)*0.5 + dropRate*0.3 + (1/timeToComplete)*0.2
 */
export function scoreEasiest(mount: Mount): number {
  const minutes = Math.max(mount.timeToComplete, 1);
  return (
    (1 - mount.difficulty / 5) * 0.5 +
    mount.dropRate * 0.3 +
    (1 / minutes) * 0.2
  );
}
