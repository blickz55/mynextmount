import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { spellIdFromMountDetail } from "./blizzard-mount.mjs";

const DEFAULT_REL = join("data", "baseline", "mount-to-summon-spell.json");

/**
 * Blizzard mount detail JSON (12.x) often omits `spell`; use Mount.db2 SourceSpellID map.
 */
export function summonSpellIdForMount(detail, mountNumericId, map) {
  const fromApi = spellIdFromMountDetail(detail);
  if (fromApi != null) return fromApi;
  if (!map || mountNumericId == null) return null;
  const sid = map[String(mountNumericId)];
  if (sid == null || sid === "") return null;
  const n = Number(sid);
  return Number.isFinite(n) ? n : null;
}

export function loadMountToSpellMap(root, relPath = DEFAULT_REL) {
  const p = join(root, relPath);
  if (!existsSync(p)) return null;
  const data = JSON.parse(readFileSync(p, "utf8"));
  if (data && typeof data.map === "object" && data.map !== null) {
    return data.map;
  }
  return null;
}
