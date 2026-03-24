/**
 * Epic B.1 — Compare data/mounts.json spell IDs to Blizzard Retail mount API.
 *
 * With BLIZZARD_CLIENT_ID + BLIZZARD_CLIENT_SECRET: fetches all mounts, extracts
 * summon spell IDs, diffs vs dataset + catalog-exceptions.json.
 *
 * Without credentials: local stats only (stub count, duplicate ids).
 *
 * Usage:
 *   npm run data:check-coverage
 *   (loads .env then .env.local from project root; or set BLIZZARD_* in the shell)
 *
 * Options:
 *   --max=N   Only fetch first N mount details (dev speed; inaccurate diff)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";
import {
  apiHostForRegion,
  getAccessToken,
} from "./lib/blizzard-mount.mjs";
import { collectApiMountSpellIds } from "./lib/collect-api-mount-spell-ids.mjs";
import { loadMountToSpellMap } from "./lib/mount-spell-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const STUB_NAME = /^Mount \(spell \d+\)$/;

function loadJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

async function main() {
  const args = process.argv.slice(2);
  let maxMounts = Infinity;
  for (const a of args) {
    if (a.startsWith("--max=")) {
      maxMounts = Number(a.slice(6)) || 0;
    }
  }

  loadProjectEnv(root);

  const exceptionsPath = join(root, "data", "catalog-exceptions.json");
  const mounts = loadJson("data/mounts.json");
  const exceptions = existsSync(exceptionsPath)
    ? loadJson("data/catalog-exceptions.json")
    : { excludedSpellIds: [] };
  const excluded = new Set(
    Array.isArray(exceptions.excludedSpellIds)
      ? exceptions.excludedSpellIds.map(Number)
      : [],
  );

  const datasetIds = new Set();
  const duplicates = [];
  let stubRows = 0;
  let stubTagRows = 0;

  for (const m of mounts) {
    if (datasetIds.has(m.id)) duplicates.push(m.id);
    datasetIds.add(m.id);
    if (STUB_NAME.test(String(m.name || ""))) stubRows += 1;
    if (Array.isArray(m.tags) && m.tags.includes("stub")) stubTagRows += 1;
  }

  console.log("[check-mount-coverage] Local dataset");
  console.log(`  Rows: ${mounts.length}`);
  console.log(`  Unique spell IDs: ${datasetIds.size}`);
  if (duplicates.length) {
    console.log(`  WARNING duplicate id values: ${duplicates.join(", ")}`);
  }
  console.log(`  Stub-like name (Mount (spell N)): ${stubRows}`);
  console.log(`  Rows with tag "stub": ${stubTagRows}`);

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = (process.env.BLIZZARD_REGION || "us").toLowerCase();
  const delayMs = Number(process.env.COVERAGE_FETCH_DELAY_MS || 1000);

  if (!clientId || !clientSecret) {
    const envPath = join(root, ".env");
    const localPath = join(root, ".env.local");
    const hasEnv = existsSync(envPath);
    const hasLocal = existsSync(localPath);
    console.log(
      "\n[check-mount-coverage] No BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET — skipping API diff.",
    );
    console.log(
      `  Project root: ${root}\n  .env exists: ${hasEnv}\n  .env.local exists: ${hasLocal}`,
    );
    if (!hasEnv && !hasLocal) {
      console.log(
        "  Add a .env or .env.local in that folder (not only .env.example) with:",
      );
      console.log("    BLIZZARD_CLIENT_ID=...\n    BLIZZARD_CLIENT_SECRET=...");
    } else {
      if (hasLocal) {
        try {
          const raw = readFileSync(localPath);
          if (raw.length === 0) {
            console.log(
              "  .env.local is 0 bytes on disk — save the file in your editor (Ctrl+S), then retry.",
            );
          }
        } catch {
          /* ignore */
        }
      }
      console.log(
        "  Otherwise: keys must be exactly BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET (non-empty).",
      );
      console.log(
        "  Non-empty BLIZZARD_* in the shell or Windows User/System environment override the file.",
      );
    }
    console.log("  See .env.example for placeholders.\n");
    process.exit(0);
  }

  const namespace = `static-${region}`;
  const apiHost = apiHostForRegion(region);

  console.log(
    `\n[check-mount-coverage] Fetching mount index (${namespace})…`,
  );

  const mountToSpell = loadMountToSpellMap(root);
  if (!mountToSpell) {
    console.error(
      "\n[check-mount-coverage] Missing data/baseline/mount-to-summon-spell.json",
    );
    console.error(
      "  Run: npm run data:ingest-mount-map\n  (Mount API no longer includes spell id in JSON.)\n",
    );
    process.exit(1);
  }

  const token = await getAccessToken(clientId, clientSecret);
  const headers = { Authorization: `Bearer ${token}` };

  const { mountHrefs, apiSpellIds, failures } =
    await collectApiMountSpellIds({
      apiHost,
      namespace,
      headers,
      mountToSpell,
      maxMounts,
      delayMs,
      useCache: false,
      log: (msg) => console.log(msg),
    });

  console.log(`  Index entries: ${mountHrefs.length}`);
  if (failures) {
    console.log(`  Detail failures (skipped): ${failures}`);
  }

  if (maxMounts < mountHrefs.length) {
    console.log(
      `\n  NOTE: --max=${maxMounts} — spell set incomplete; diff is indicative only.`,
    );
  }

  const missingFromDataset = [];
  for (const sid of apiSpellIds) {
    if (datasetIds.has(sid)) continue;
    if (excluded.has(sid)) continue;
    missingFromDataset.push(sid);
  }
  missingFromDataset.sort((a, b) => a - b);

  const extraInDataset = [];
  for (const sid of datasetIds) {
    if (!apiSpellIds.has(sid)) extraInDataset.push(sid);
  }
  extraInDataset.sort((a, b) => a - b);

  console.log("\n[check-mount-coverage] Diff (API spell IDs vs dataset)");
  console.log(`  API unique spell IDs (from details): ${apiSpellIds.size}`);
  console.log(`  Missing from dataset (not in exceptions): ${missingFromDataset.length}`);
  if (missingFromDataset.length) {
    const preview = missingFromDataset.slice(0, 40).join(", ");
    console.log(`  First IDs: ${preview}${missingFromDataset.length > 40 ? " …" : ""}`);
  }
  console.log(`  In dataset but not in API detail set: ${extraInDataset.length}`);
  if (extraInDataset.length && extraInDataset.length <= 30) {
    console.log(`  IDs: ${extraInDataset.join(", ")}`);
  } else if (extraInDataset.length) {
    console.log(`  First IDs: ${extraInDataset.slice(0, 30).join(", ")} …`);
  }
  console.log(`  Catalog exceptions (ignored missing): ${excluded.size}`);

  if (maxMounts >= mountHrefs.length && missingFromDataset.length > 0) {
    console.log(
      "\n[check-mount-coverage] FAIL — dataset does not cover all API mount spells (after exceptions).",
    );
    process.exit(1);
  }

  if (maxMounts >= mountHrefs.length) {
    console.log(
      "\n[check-mount-coverage] OK — no unexpected gaps vs API spell set.",
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[check-mount-coverage] ERROR", e.message || e);
  process.exit(2);
});
