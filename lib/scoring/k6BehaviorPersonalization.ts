import { mountLooksRaidHeavy } from "@/lib/mountRaidHeavy";
import type { Mount } from "@/types/mount";

import { clamp } from "./factors";
import type { ScoringPersonalization } from "./types";

const SHORT_RUN_MAX_BONUS = 0.072;
const RAID_AVOIDANCE_MULT_MAX = 0.14;
const TIME_CAP_MIN = 240;

function timeAffinityShortRuns(mount: Mount): number {
  const timeMin = Math.max(1, mount.timeToComplete);
  return clamp(
    1 - Math.log1p(timeMin) / Math.log1p(TIME_CAP_MIN),
    0,
    1,
  );
}

/**
 * Epic K.6 — nudge scores from locally learned preferences (after K.4).
 */
export function applyK6BehaviorPersonalizationToScore(
  mount: Mount,
  scoreAfterK4: number,
  personalization?: ScoringPersonalization,
): number {
  const b = personalization?.behavior;
  if (b == null) return scoreAfterK4;

  let s = scoreAfterK4;
  if (b.preferShortRunsStrength > 0) {
    s +=
      SHORT_RUN_MAX_BONUS *
      b.preferShortRunsStrength *
      timeAffinityShortRuns(mount);
  }
  if (b.raidAvoidanceStrength > 0 && mountLooksRaidHeavy(mount)) {
    s *= 1 - RAID_AVOIDANCE_MULT_MAX * b.raidAvoidanceStrength;
  }
  return s;
}
