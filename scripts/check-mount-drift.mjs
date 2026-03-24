/**
 * Epic B.6 — Drift detection: API mount index vs data/mounts.json, optional spell-ID diff.
 *
 * Usage:
 *   npm run data:check-drift
 *   npm run data:check-drift -- --spell-diff
 *   npm run data:check-drift -- --spell-diff --strict
 *   npm run data:check-drift -- --max=80   (fast sample; counts/diff incomplete)
 *   npm run data:check-drift -- --no-snapshot   (do not update drift-report.json previous)
 *
 * Env: BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET (optional — without them, local JSON stats only)
 *      BLIZZARD_REGION, COVERAGE_FETCH_DELAY_MS / DRIFT_FETCH_DELAY_MS
 *      BUILD_CACHE_TTL_SECONDS — TTL for mount detail cache when --spell-diff uses cache
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";
import {
  apiHostForRegion,
  fetchAllMountHrefs,
  getAccessToken,
} from "./lib/blizzard-mount.mjs";
import { collectApiMountSpellIds } from "./lib/collect-api-mount-spell-ids.mjs";
import { loadMountToSpellMap } from "./lib/mount-spell-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const reportPath = join(root, "data", "build", "drift-report.json");

function loadJson(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), "utf8"));
}

async function main() {
  const args = process.argv.slice(2);
  let maxMounts = Infinity;
  let spellDiff = false;
  let strict = false;
  let noSnapshot = false;
  let forceRefresh = false;

  for (const a of args) {
    if (a.startsWith("--max=")) maxMounts = Number(a.slice(6)) || 0;
    else if (a === "--spell-diff") spellDiff = true;
    else if (a === "--strict") strict = true;
    else if (a === "--no-snapshot") noSnapshot = true;
    else if (a === "--force-refresh") forceRefresh = true;
  }

  loadProjectEnv(root);

  const mounts = loadJson("data/mounts.json");
  if (!Array.isArray(mounts)) {
    console.error("[check-mount-drift] data/mounts.json must be a JSON array.");
    process.exit(2);
  }

  const exceptionsPath = join(root, "data", "catalog-exceptions.json");
  const exceptions = existsSync(exceptionsPath)
    ? loadJson("data/catalog-exceptions.json")
    : { excludedSpellIds: [] };
  const excluded = new Set(
    Array.isArray(exceptions.excludedSpellIds)
      ? exceptions.excludedSpellIds.map(Number)
      : [],
  );

  const datasetIds = new Set();
  for (const m of mounts) {
    datasetIds.add(m.id);
  }

  const mountsJsonRows = mounts.length;

  let previousCurrent = null;
  if (existsSync(reportPath)) {
    try {
      const prev = JSON.parse(readFileSync(reportPath, "utf8"));
      if (prev && prev.current && typeof prev.current === "object") {
        previousCurrent = prev.current;
      }
    } catch {
      /* ignore */
    }
  }

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = (process.env.BLIZZARD_REGION || "us").toLowerCase();
  const delayMs = Number(
    process.env.DRIFT_FETCH_DELAY_MS ||
      process.env.COVERAGE_FETCH_DELAY_MS ||
      1000,
  );
  const cacheTtlSec = Number(process.env.BUILD_CACHE_TTL_SECONDS || 86400);

  console.log("[check-mount-drift] Local dataset");
  console.log(`  mounts.json rows: ${mountsJsonRows}`);
  console.log(`  Unique spell IDs: ${datasetIds.size}`);
  console.log(`  Catalog exceptions (spell ids): ${excluded.size}`);

  if (!clientId || !clientSecret) {
    console.log(
      "\n[check-mount-drift] No BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET — API comparison skipped.",
    );
    console.log(
      "  Set credentials for index count + optional --spell-diff (see .env.example).\n",
    );
    process.exit(0);
  }

  let mountToSpell = null;
  if (spellDiff) {
    mountToSpell = loadMountToSpellMap(root);
    if (!mountToSpell) {
      console.error(
        "\n[check-mount-drift] Missing data/baseline/mount-to-summon-spell.json",
      );
      console.error("  Run: npm run data:ingest-mount-map\n");
      process.exit(2);
    }
  }

  const apiHost = apiHostForRegion(region);
  const namespace = `static-${region}`;
  const token = await getAccessToken(clientId, clientSecret);
  const headers = { Authorization: `Bearer ${token}` };

  console.log(`\n[check-mount-drift] API mount index (${namespace})…`);
  const mountHrefs = await fetchAllMountHrefs(apiHost, namespace, headers);
  const apiMountIndexEntries = mountHrefs.length;
  console.log(`  Index entries (journal mounts): ${apiMountIndexEntries}`);
  console.log(
    "  Note: index size ≠ mounts.json rows (rows are unique summon spell IDs; duplicates / remaps differ).",
  );

  let apiUniqueSummonSpells = null;
  let missingFromDataset = [];
  let extraInDataset = [];
  let spellDiffIncomplete = false;
  let detailFailures = 0;
  let cacheHits = 0;

  if (spellDiff) {
    console.log(
      `\n[check-mount-drift] Resolving summon spell IDs (--spell-diff, cache TTL ${cacheTtlSec}s)…`,
    );
    const result = await collectApiMountSpellIds({
      root,
      apiHost,
      namespace,
      headers,
      mountToSpell,
      maxMounts,
      delayMs,
      useCache: true,
      cacheTtlSec,
      forceRefresh,
      log: (msg) => console.log(msg),
    });

    detailFailures = result.failures;
    cacheHits = result.cacheHits;
    apiUniqueSummonSpells = result.apiSpellIds.size;

    if (maxMounts < result.mountHrefs.length) {
      spellDiffIncomplete = true;
      console.log(
        `\n  NOTE: --max=${maxMounts} — spell set incomplete; missing/extra lists are indicative only.`,
      );
    }

    for (const sid of result.apiSpellIds) {
      if (datasetIds.has(sid)) continue;
      if (excluded.has(sid)) continue;
      missingFromDataset.push(sid);
    }
    missingFromDataset.sort((a, b) => a - b);

    for (const sid of datasetIds) {
      if (!result.apiSpellIds.has(sid)) extraInDataset.push(sid);
    }
    extraInDataset.sort((a, b) => a - b);

    console.log("\n[check-mount-drift] Spell ID set diff");
    console.log(`  API unique summon spells: ${apiUniqueSummonSpells}`);
    console.log(`  Missing from dataset (not excepted): ${missingFromDataset.length}`);
    if (missingFromDataset.length) {
      const preview = missingFromDataset.slice(0, 50).join(", ");
      console.log(
        `  IDs to add after data:build: ${preview}${missingFromDataset.length > 50 ? " …" : ""}`,
      );
    }
    console.log(`  In dataset, not in API spell set: ${extraInDataset.length}`);
    if (extraInDataset.length && extraInDataset.length <= 40) {
      console.log(`  IDs: ${extraInDataset.join(", ")}`);
    } else if (extraInDataset.length) {
      console.log(`  First IDs: ${extraInDataset.slice(0, 40).join(", ")} …`);
    }
    if (detailFailures) {
      console.log(`  Detail failures during walk: ${detailFailures}`);
    }
    if (cacheHits) {
      console.log(`  Mount detail cache hits: ${cacheHits}`);
    }
  }

  const current = {
    apiMountIndexEntries,
    mountsJsonRows,
    apiUniqueSummonSpells,
    namespace,
    region,
    spellDiffRan: spellDiff,
    spellDiffIncomplete,
    maxMountsCap:
      maxMounts < apiMountIndexEntries ? maxMounts : undefined,
  };

  const deltaFromPrevious =
    previousCurrent &&
    typeof previousCurrent.apiMountIndexEntries === "number"
      ? {
          apiMountIndexEntries:
            apiMountIndexEntries - previousCurrent.apiMountIndexEntries,
          mountsJsonRows: mountsJsonRows - previousCurrent.mountsJsonRows,
          apiUniqueSummonSpells:
            previousCurrent.apiUniqueSummonSpells != null &&
            apiUniqueSummonSpells != null
              ? apiUniqueSummonSpells - previousCurrent.apiUniqueSummonSpells
              : null,
        }
      : null;

  if (deltaFromPrevious) {
    console.log("\n[check-mount-drift] Delta vs last drift-report.json run");
    console.log(
      `  API index entries: ${deltaFromPrevious.apiMountIndexEntries >= 0 ? "+" : ""}${deltaFromPrevious.apiMountIndexEntries}`,
    );
    console.log(
      `  mounts.json rows: ${deltaFromPrevious.mountsJsonRows >= 0 ? "+" : ""}${deltaFromPrevious.mountsJsonRows}`,
    );
    if (deltaFromPrevious.apiUniqueSummonSpells != null) {
      console.log(
        `  API unique spells: ${deltaFromPrevious.apiUniqueSummonSpells >= 0 ? "+" : ""}${deltaFromPrevious.apiUniqueSummonSpells}`,
      );
    }
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    current,
    deltaFromPrevious,
    spellDiff: spellDiff
      ? {
          missingFromDataset,
          extraInDataset,
          missingCount: missingFromDataset.length,
          extraCount: extraInDataset.length,
          detailFailures,
          cacheHits,
        }
      : null,
  };

  if (!noSnapshot) {
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log(`\n[check-mount-drift] Wrote ${reportPath}`);
  }

  if (
    strict &&
    spellDiff &&
    !spellDiffIncomplete &&
    missingFromDataset.length > 0
  ) {
    console.log(
      "\n[check-mount-drift] FAIL (--strict) — dataset missing API spells (after exceptions).",
    );
    process.exit(1);
  }

  console.log("\n[check-mount-drift] OK\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("[check-mount-drift] ERROR", e.message || e);
  process.exit(2);
});
