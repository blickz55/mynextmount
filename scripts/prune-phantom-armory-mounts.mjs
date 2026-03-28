/**
 * One-off: remove mounts that never shipped (armory phantoms) by exact display name,
 * scrub sidecar JSON keys, assert unique spell ids.
 *
 *   node scripts/prune-phantom-armory-mounts.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** Exact journal-style names from curator list (no "Brewfest Kodo" in our data). */
const REMOVE_NAMES = new Set([
  "Illidari Doomhawk",
  "Black Polar Bear",
  "Black Riding Yak",
  "Blue Qiraji War Tank",
  "Modest Expedition Yak",
  "Gray Wolf",
  "Brewfest Kodo",
  "Red Qiraji War Tank",
  "Riding Kodo",
  "Swift Spectral Armored Gryphon",
  "Swift Spectral Fathom Ray",
  "Swift Spectral Hippogryph",
  "Swift Spectral Magnetocraft",
  "Swift Spectral Pterrordax",
  "Swift Spectral Rylak",
  "Tiger",
  "Kafa Yak",
  "Winter Wolf",
  "Grand Caravan Mammoth",
]);

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function saveJson(rel, data) {
  writeFileSync(join(root, rel), JSON.stringify(data, null, 2) + "\n", "utf8");
}

function assertUniqueSpellIds(mounts) {
  const seen = new Map();
  for (const m of mounts) {
    if (seen.has(m.id)) {
      throw new Error(
        `Duplicate spell id ${m.id}: "${seen.get(m.id)}" and "${m.name}"`,
      );
    }
    seen.set(m.id, m.name);
  }
}

function main() {
  const mountsPath = "data/mounts.json";
  const mounts = loadJson(mountsPath);
  if (!Array.isArray(mounts)) throw new Error("mounts.json must be an array");

  const removed = [];
  const kept = [];
  for (const m of mounts) {
    if (REMOVE_NAMES.has(m.name)) removed.push(m);
    else kept.push(m);
  }
  kept.sort((a, b) => a.id - b.id);
  assertUniqueSpellIds(kept);

  const removedIds = new Set(removed.map((r) => r.id));
  console.log(
    `Removed ${removed.length} mount(s):\n${removed.map((r) => `  ${r.id}\t${r.name}`).join("\n")}`,
  );
  const missingNames = [...REMOVE_NAMES].filter(
    (n) => !removed.some((r) => r.name === n),
  );
  if (missingNames.length) {
    console.log(`\n(Not in catalog — skipped: ${missingNames.join(", ")})`);
  }

  saveJson(mountsPath, kept);

  const dig = loadJson("data/wowhead-comment-digests.json");
  for (const id of removedIds) delete dig[String(id)];
  saveJson("data/wowhead-comment-digests.json", dig);

  const guidesFile = loadJson("data/mount-guides.json");
  if (guidesFile.guides && typeof guidesFile.guides === "object") {
    for (const id of removedIds) delete guidesFile.guides[String(id)];
    saveJson("data/mount-guides.json", guidesFile);
  }

  const tipsPath = "data/farm-tips.json";
  const tips = loadJson(tipsPath);
  for (const id of removedIds) delete tips[String(id)];
  saveJson(tipsPath, tips);

  const itemBySpell = loadJson("data/overrides/wowhead-item-by-spell.json");
  for (const id of removedIds) delete itemBySpell[String(id)];
  saveJson("data/overrides/wowhead-item-by-spell.json", itemBySpell);

  const iconOv = loadJson("data/mount-icon-overrides.json");
  for (const id of removedIds) delete iconOv[String(id)];
  saveJson("data/mount-icon-overrides.json", iconOv);

  const retail = loadJson("data/overrides/retail-unobtainable.json");
  if (Array.isArray(retail.patches)) {
    retail.patches = retail.patches.filter((p) => !removedIds.has(p.id));
    saveJson("data/overrides/retail-unobtainable.json", retail);
  }

  console.log(`\nCatalog now ${kept.length} mounts; spell ids unique.`);
}

main();
