import type { Mount } from "@/types/mount";

/**
 * Epic D.1 — Link to Wowhead **comments** for this mount’s summon spell.
 * Dataset uses spell IDs (`docs/export-contract.md`); Wowhead `/spell=id#comments` is the stable pattern.
 */
export function wowheadCommentsUrl(mount: Mount): string | null {
  const c = mount.commentsUrl?.trim();
  if (c) return c;
  const base = mount.wowheadUrl?.trim();
  if (!base) return null;
  if (base.includes("#")) return base;
  return `${base}#comments`;
}
