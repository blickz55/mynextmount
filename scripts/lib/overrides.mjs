import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Merge override objects for the same spell id from all `data/overrides/*.json` files.
 * Filenames sorted alphabetically; later files win on key collision.
 */
export function loadOverridesMap(overridesDir) {
  const merged = new Map();
  if (!existsSync(overridesDir)) return merged;

  const files = readdirSync(overridesDir)
    .filter((n) => n.endsWith(".json"))
    .sort();

  function applyPatch(id, patch) {
    if (id == null || !Number.isFinite(Number(id))) return;
    const sid = Number(id);
    const cur = merged.get(sid) || {};
    const next = { ...cur };
    for (const [k, v] of Object.entries(patch)) {
      if (k === "id" || k === "_comment" || k === "notes" || k === "schemaVersion")
        continue;
      next[k] = v;
    }
    merged.set(sid, next);
  }

  for (const name of files) {
    const raw = readFileSync(join(overridesDir, name), "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      for (const p of data) applyPatch(p.id, p);
    } else if (data && Array.isArray(data.patches)) {
      for (const p of data.patches) applyPatch(p.id, p);
    } else if (data && typeof data === "object") {
      for (const [k, v] of Object.entries(data)) {
        if (k === "schemaVersion" || k === "patches" || k === "notes") continue;
        const id = Number(k);
        if (!Number.isFinite(id) || typeof v !== "object" || v === null) continue;
        applyPatch(id, v);
      }
    }
  }
  return merged;
}

export function applyRowOverride(row, ov) {
  if (!ov) return;
  for (const [k, v] of Object.entries(ov)) {
    if (k === "id") continue;
    row[k] = v;
  }
}
