/**
 * Epic B.5 — Re-apply sourceCategory → scoring fields, then `data/overrides/*.json`.
 * No API calls; use after changing `scripts/lib/scoring-heuristics.mjs` or to refresh
 * an existing `data/mounts.json` without a full `data:build`.
 *
 * Usage:
 *   npm run data:apply-scores
 *   npm run data:apply-scores -- --dry-run
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOverridesMap, applyRowOverride } from "./lib/overrides.mjs";
import {
  applyScoringHeuristics,
  SCORING_HEURISTICS_VERSION,
} from "./lib/scoring-heuristics.mjs";
import { applyDefaultLocation } from "./lib/location-default.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const mountsPath = join(root, "data", "mounts.json");
const overridesDir = join(root, "data", "overrides");
const reportPath = join(root, "data", "build", "scoring-heuristics-report.json");

const dryRun = process.argv.includes("--dry-run");

function main() {
  const mounts = JSON.parse(readFileSync(mountsPath, "utf8"));
  if (!Array.isArray(mounts)) {
    console.error("[data:apply-scores] expected data/mounts.json to be a JSON array");
    process.exit(1);
  }

  const overridesById = loadOverridesMap(overridesDir);
  const categoryHistogram = {};
  let overrideHits = 0;

  for (const row of mounts) {
    const raw = String(row.sourceCategory || "").toLowerCase().trim();
    const histKey = raw || "(empty→default)";
    categoryHistogram[histKey] = (categoryHistogram[histKey] || 0) + 1;

    applyScoringHeuristics(row);
    if (overridesById.has(row.id)) overrideHits += 1;
    applyRowOverride(row, overridesById.get(row.id));
    applyDefaultLocation(row);
  }

  const generatedAt = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    generatedAt,
    scoringHeuristicsVersion: SCORING_HEURISTICS_VERSION,
    dryRun,
    rowCount: mounts.length,
    categoryHistogram,
    rowsWithOverrides: overrideHits,
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  if (!dryRun) {
    writeFileSync(mountsPath, JSON.stringify(mounts, null, 2) + "\n", "utf8");
  }

  console.log(
    `[data:apply-scores] ${dryRun ? "DRY-RUN — " : ""}processed ${mounts.length} rows; ` +
      `${overrideHits} had overrides. Report → data/build/scoring-heuristics-report.json`,
  );
  if (dryRun) {
    console.log("  (mounts.json not written; run without --dry-run to apply)");
  }
}

main();
