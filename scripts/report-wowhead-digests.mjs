/**
 * Epic D.5 — Summarize wowhead comment digest coverage vs mounts.json.
 * Writes data/build/wowhead-digest-report.json (gitignored dir is OK; ensure mkdir).
 *
 * Usage: node scripts/report-wowhead-digests.mjs
 *        node scripts/report-wowhead-digests.mjs --strict-pilots  (exit 1 if pilot spell ids missing digest)
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PILOT_SPELL_IDS = [40192, 72286, 60002, 6648, 71810, 5784];

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const strictPilots = process.argv.includes("--strict-pilots");
  const mounts = loadJson(join(root, "data", "mounts.json"));
  const digests = loadJson(join(root, "data", "wowhead-comment-digests.json"));

  if (!Array.isArray(mounts)) {
    console.error("[wowhead-digest-report] mounts.json must be an array.");
    process.exit(2);
  }

  const withWowhead = mounts.filter(
    (m) =>
      typeof m?.wowheadUrl === "string" &&
      m.wowheadUrl.trim() !== "",
  );
  const digestKeys = new Set(
    Object.keys(digests).filter((k) => /^\d+$/.test(k)),
  );
  const withDigestLines = Object.entries(digests).filter(([k, v]) => {
    if (!/^\d+$/.test(k)) return false;
    const lines = v?.lines;
    return Array.isArray(lines) && lines.some((s) => String(s).trim());
  });
  const digestIdSet = new Set(withDigestLines.map(([k]) => Number(k)));

  const pilotMissing = PILOT_SPELL_IDS.filter((id) => !digestIdSet.has(id));

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: "Epic D.5 — wowhead-comment-digests.json vs data/mounts.json",
    counts: {
      mountRows: mounts.length,
      rowsWithWowheadUrl: withWowhead.length,
      digestSpellIdsWithLines: digestIdSet.size,
    },
    pilots: {
      expectedSpellIds: PILOT_SPELL_IDS,
      missingDigest: pilotMissing,
    },
  };

  const outDir = join(root, "data", "build");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "wowhead-digest-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`[wowhead-digest-report] Wrote ${outPath}`);
  console.log(
    `  mount rows: ${report.counts.mountRows}; with wowheadUrl: ${report.counts.rowsWithWowheadUrl}; digest ids (non-empty): ${report.counts.digestSpellIdsWithLines}`,
  );
  if (pilotMissing.length > 0) {
    console.log(`  WARNING pilot spell ids missing digest: ${pilotMissing.join(", ")}`);
    if (strictPilots) process.exit(1);
  } else {
    console.log("  pilots: all 6 guide spell ids have digest lines.");
  }
}

main();
