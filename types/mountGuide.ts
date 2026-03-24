/**
 * Epic C.1 — Optional per-mount farming guide (text-first checklist).
 * Stored in `data/mount-guides.json`, merged at load in `lib/mounts.ts`.
 */
export type MountGuide = {
  /** Short original summary (not long copied guide text). */
  overview: string;
  /** Ordered steps the player can check off. */
  checklist: readonly string[];
  /** Primary citation URL (Wowhead, official article, etc.). */
  sourceUrl: string;
  /** Accessible link text, e.g. "Wowhead — Ashes of Al'ar (item)". */
  sourceLabel: string;
};
