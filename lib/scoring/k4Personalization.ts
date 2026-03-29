import type { Mount } from "@/types/mount";

import type { ScoringPersonalization } from "./types";

/** Tunable K.4 weights — small vs typical composite scores (~0–1). */
const LOCKED_SCORE_FACTOR = 0.018;
const ATTEMPT_MAX_BONUS = 0.13;
const ATTEMPT_TAU = 9;
const WEEKLY_URGENCY_MAX = 0.1;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Epic K.4 — additive-ish adjustments on top of baseline composite / rarest score.
 * When `personalization` is undefined, returns `baseScore` unchanged (backward compatible).
 */
export function applyK4PersonalizationToScore(
  mount: Mount,
  baseScore: number,
  personalization?: ScoringPersonalization,
): number {
  if (personalization == null) return baseScore;

  const id = mount.id;
  const lock = personalization.lockoutBySpellId?.[id];
  if (lock?.state === "locked") {
    return baseScore * LOCKED_SCORE_FACTOR;
  }

  let s = baseScore;
  const attempts = personalization.attemptsBySpellId?.[id] ?? 0;
  if (attempts > 0) {
    s += ATTEMPT_MAX_BONUS * (1 - Math.exp(-attempts / ATTEMPT_TAU));
  }

  if (
    mount.lockout === "weekly" &&
    lock?.state === "available" &&
    personalization.nextWeeklyResetAt
  ) {
    const now =
      personalization.nowMs != null ? personalization.nowMs : Date.now();
    const end = new Date(personalization.nextWeeklyResetAt).getTime();
    const msLeft = Math.max(0, end - now);
    const urgency = 1 - Math.min(1, msLeft / WEEK_MS);
    s += WEEKLY_URGENCY_MAX * urgency;
  }

  return s;
}
