/**
 * Build `data/baseline/mount-to-summon-spell.json` from Wago Tools Mount.db2 CSV.
 *
 * Blizzard Game Data mount documents no longer expose summon spell linkage (12.x);
 * `SourceSpellID` in Mount.db2 matches journal / addon export spell ids.
 *
 * Usage: npm run data:ingest-mount-map
 *
 * Source: https://wago.tools/db2/Mount/csv (community DB2 mirror; Tier 2 in docs).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsvRecords } from "./lib/csv-parse-line.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SOURCE_URL = "https://wago.tools/db2/Mount/csv";
const OUT_REL = join("data", "baseline", "mount-to-summon-spell.json");

async function main() {
  process.stderr.write(`[data:ingest-mount-map] Fetching ${SOURCE_URL}…\n`);
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "MyNextMount/0.1 (data:ingest-mount-map)",
    },
  });
  if (!res.ok) {
    throw new Error(`CSV fetch ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const text = await res.text();
  const records = parseCsvRecords(text);
  if (records.length < 2) {
    throw new Error("CSV empty or missing rows");
  }

  const header = records[0];
  const idIdx = header.indexOf("ID");
  const spellIdx = header.indexOf("SourceSpellID");
  if (idIdx < 0 || spellIdx < 0) {
    throw new Error(
      `CSV missing ID or SourceSpellID column; got: ${header.join(",")}`,
    );
  }

  const map = Object.create(null);
  let rows = 0;
  let skippedZeroSpell = 0;
  for (let i = 1; i < records.length; i++) {
    const cols = records[i];
    if (!cols || cols.length <= Math.max(idIdx, spellIdx)) continue;
    const mid = cols[idIdx];
    const sid = cols[spellIdx];
    if (!mid || sid === undefined || sid === "") continue;
    const mountId = Number(mid);
    const spellId = Number(sid);
    if (!Number.isFinite(mountId) || !Number.isFinite(spellId)) continue;
    if (spellId === 0) {
      skippedZeroSpell += 1;
      continue;
    }
    map[String(mountId)] = spellId;
    rows += 1;
  }

  const outPath = join(root, OUT_REL);
  mkdirSync(dirname(outPath), { recursive: true });
  const payload = {
    schemaVersion: 1,
    sourceUrl: SOURCE_URL,
    retrievedAt: new Date().toISOString(),
    notes:
      "Mount.db2 SourceSpellID → summon spell id for Game Data mount id. Refresh after major patches if data:build cannot resolve spells. CSV uses multiline quoted fields — ingest uses parseCsvRecords (not line-split).",
    rowCount: rows,
    skippedZeroSourceSpellId: skippedZeroSpell,
    map,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

  console.log(`[data:ingest-mount-map] OK — ${rows} mount→spell pairs → ${OUT_REL}`);
  if (skippedZeroSpell) {
    console.log(`  (skipped ${skippedZeroSpell} rows with SourceSpellID=0)\n`);
  } else {
    console.log("");
  }
}

main().catch((e) => {
  console.error("[data:ingest-mount-map] ERROR", e.message || e);
  process.exit(1);
});
