/**
 * Merge every `data/overrides/*.json` patch into `data/mounts.json` by summon spell id.
 * Use after editing overrides without a full `npm run data:build` (no Blizzard API).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOverridesMap, applyRowOverride } from "./lib/overrides.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mountsPath = join(root, "data", "mounts.json");
const overridesDir = join(root, "data", "overrides");

function main() {
  if (!existsSync(mountsPath)) {
    console.error("[data:apply-overrides] Missing data/mounts.json");
    process.exit(1);
  }
  const mounts = JSON.parse(readFileSync(mountsPath, "utf8"));
  if (!Array.isArray(mounts)) {
    console.error("[data:apply-overrides] mounts.json must be a JSON array.");
    process.exit(1);
  }
  const bySpell = loadOverridesMap(overridesDir);
  let patched = 0;
  for (const row of mounts) {
    const id = row?.id;
    if (typeof id !== "number") continue;
    const ov = bySpell.get(id);
    if (!ov) continue;
    const before = JSON.stringify(row);
    applyRowOverride(row, ov);
    if (JSON.stringify(row) !== before) patched += 1;
  }
  writeFileSync(mountsPath, JSON.stringify(mounts, null, 2) + "\n", "utf8");
  console.log(
    `[data:apply-overrides] OK — merged overrides into ${mounts.length} row(s); ${patched} row(s) changed.`,
  );
}

main();
