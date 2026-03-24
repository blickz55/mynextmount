import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const path = join(root, "data", "defaults", "location-by-source-category.json");

let cache;

function loadMap() {
  if (!cache) {
    cache = JSON.parse(readFileSync(path, "utf8"));
  }
  return cache;
}

/**
 * Sets `row.location` when missing or "Unknown". Overrides and explicit
 * locations win — run after scoring + row overrides in batch scripts.
 */
export function applyDefaultLocation(row) {
  const loc = String(row.location || "").trim();
  if (loc && loc !== "Unknown") return;

  if (Array.isArray(row.tags) && row.tags.includes("stub")) {
    row.location = "Stub row — run data:build for a real location";
    return;
  }

  const map = loadMap();
  const cat = String(row.sourceCategory || "").toLowerCase().trim();
  row.location = map[cat] || map.default;
}
