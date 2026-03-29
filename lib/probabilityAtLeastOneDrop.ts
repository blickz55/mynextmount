/**
 * Epic K.2.2 — naive i.i.d. model: P(≥1 success in n tries) = 1 − (1−p)^n.
 * `dropRate` is 0–1 (catalog heuristic). Returns rounded percent or null when undefined.
 */
export function probabilityAtLeastOneDropSeenPercent(
  dropRate: number,
  attempts: number,
): number | null {
  if (!Number.isFinite(attempts) || attempts < 1) return null;
  const p = Number(dropRate);
  if (!Number.isFinite(p) || p <= 0) return null;
  const clamped = Math.min(1, Math.max(0, p));
  const prob = 1 - (1 - clamped) ** attempts;
  return Math.round(Math.min(100, Math.max(0, prob * 100)));
}
