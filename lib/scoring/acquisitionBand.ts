/**
 * Human-readable bands for composite scores (~[0, 1]).
 * Used instead of raw decimals in the UI.
 */

const ACQUISITION_BANDS = [
  "Extremely Rare",
  "Very Rare",
  "Rare",
  "Uncommon",
  "Common",
  "Very Common",
] as const;

export type AcquisitionBandLabel = (typeof ACQUISITION_BANDS)[number];

/**
 * Maps a composite score to a six-step acquisition band.
 *
 * - When `higherMeansRarer` is true (rarest profile / `scoreRarest`), high scores → rarer labels.
 * - When false (efficient / balanced recommendation), high scores → easier farms → more common labels.
 */
export function recommendationScoreToAcquisitionBandLabel(
  score: number,
  higherMeansRarer: boolean,
): AcquisitionBandLabel | "—" {
  if (!Number.isFinite(score)) return "—";
  const bucket = scoreToSixthBucket(score);
  const idx = higherMeansRarer ? 5 - bucket : bucket;
  return ACQUISITION_BANDS[idx]!;
}

/** [0,1] → 0..5; values at 1 land in the top bucket. */
function scoreToSixthBucket(score: number): number {
  const s = Math.min(1, Math.max(0, score));
  if (s >= 1) return 5;
  return Math.min(5, Math.floor(s * 6));
}
