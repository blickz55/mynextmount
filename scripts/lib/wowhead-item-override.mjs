/**
 * Optional map: summon spell id → Wowhead item id (the page where comments usually live).
 * File: data/overrides/wowhead-item-by-spell.json — { "6648": 5655, ... }
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REL = join("data", "overrides", "wowhead-item-by-spell.json");

export function loadWowheadItemOverrideMap(root) {
  const p = join(root, REL);
  if (!existsSync(p)) return {};
  try {
    const data = JSON.parse(readFileSync(p, "utf8"));
    return data !== null && typeof data === "object" && !Array.isArray(data)
      ? data
      : {};
  } catch {
    return {};
  }
}

export function applyWowheadItemIdFromMap(mount, map) {
  const raw = map[String(mount.id)];
  if (raw == null) return mount;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return mount;
  return { ...mount, wowheadItemId: n };
}

/** Merge file overrides into mount rows (override wins over existing `wowheadItemId` on the row). */
export function applyWowheadItemIdToMountsList(mounts, root) {
  const map = loadWowheadItemOverrideMap(root);
  if (Object.keys(map).length === 0) return mounts;
  return mounts.map((m) => applyWowheadItemIdFromMap(m, map));
}
