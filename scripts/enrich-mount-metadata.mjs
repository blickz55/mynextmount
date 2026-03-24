/**
 * Epic B.4 — Enrich `data/mounts.json` with Tier 1 spell media (icon file id) + spell name for QA.
 *
 * Uses Blizzard `/data/wow/spell/{summonSpellId}` + spell media — no HTML scraping.
 * Rows already carry Wowhead deep links from `data:build`; bulk Wowhead tooltip automation
 * is out of scope until a stable documented JSON endpoint is confirmed (see docs/data-harvesting.md).
 *
 * Usage:
 *   npm run data:enrich-metadata
 *   npm run data:enrich-metadata -- --max=60
 *   npm run data:enrich-metadata -- --all
 *   npm run data:enrich-metadata -- --strict
 *   npm run data:enrich-metadata -- --force-refresh
 *
 * Env: BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET, BLIZZARD_REGION
 *      ENRICH_METADATA_DELAY_MS (default 1000, after each **network** attempt — success or 404)
 *      ENRICH_METADATA_CACHE_TTL_SECONDS (default 604800 = 7d)
 *
 *      --ids=40192,72286  Only enrich rows whose summon spell id is listed (pilot / spot refresh).
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";
import {
  apiHostForRegion,
  fetchSpellEnrichment,
  getAccessToken,
  sleep,
} from "./lib/blizzard-mount.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function logProgress(msg) {
  process.stderr.write(`${msg}\n`);
}

function enrichCachePath(spellId) {
  return join(
    root,
    "data",
    "build",
    "cache",
    "blizzard",
    "spell-enrich",
    `${spellId}.json`,
  );
}

function readEnrichCache(spellId, ttlSec, forceRefresh) {
  const p = enrichCachePath(spellId);
  if (forceRefresh || !existsSync(p)) return null;
  try {
    const st = statSync(p);
    if ((Date.now() - st.mtimeMs) / 1000 > ttlSec) return null;
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writeEnrichCache(spellId, payload) {
  const p = enrichCachePath(spellId);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(
    p,
    JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }, null, 2) +
      "\n",
    "utf8",
  );
}

async function main() {
  const args = process.argv.slice(2);
  let maxRows = Infinity;
  let forceRefresh = false;
  let strict = false;
  let all = false;
  /** @type {Set<number> | null} */
  let onlyIds = null;
  for (const a of args) {
    if (a.startsWith("--max=")) maxRows = Number(a.slice(6)) || 0;
    else if (a.startsWith("--ids=")) {
      const parts = a
        .slice(6)
        .split(",")
        .map((s) => Number(String(s).trim()))
        .filter((n) => Number.isFinite(n));
      onlyIds = new Set(parts);
    } else if (a === "--force-refresh") forceRefresh = true;
    else if (a === "--strict") strict = true;
    else if (a === "--all") all = true;
  }

  loadProjectEnv(root);

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = (process.env.BLIZZARD_REGION || "us").toLowerCase();
  const delayMs = Number(process.env.ENRICH_METADATA_DELAY_MS || 1000);
  const cacheTtlSec = Number(
    process.env.ENRICH_METADATA_CACHE_TTL_SECONDS || 604800,
  );

  if (!clientId || !clientSecret) {
    console.error(
      "[data:enrich-metadata] Missing BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET.",
    );
    process.exit(1);
  }

  const mountsPath = join(root, "data", "mounts.json");
  const mounts = JSON.parse(readFileSync(mountsPath, "utf8"));
  if (!Array.isArray(mounts)) {
    console.error("[data:enrich-metadata] mounts.json must be an array.");
    process.exit(1);
  }

  const apiHost = apiHostForRegion(region);
  const token = await getAccessToken(clientId, clientSecret);
  const headers = { Authorization: `Bearer ${token}` };

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    region,
    source: "Blizzard Game Data API — /data/wow/spell + media (Tier 1, Epic B.4)",
    attempts: 0,
    successes: 0,
    skippedAlreadyHasIcon: 0,
    iconFilled: 0,
    failures: [],
    nameMismatches: [],
  };

  logProgress(
    `[data:enrich-metadata] ${mounts.length} rows; delay ${delayMs}ms after each network fetch (incl. spell 404s); cache TTL ${cacheTtlSec}s`,
  );
  logProgress(
    all
      ? "  Mode: --all (re-fetch spell+media even if iconFileId set)"
      : "  Mode: fill missing iconFileId only (use --all to refresh)",
  );
  if (onlyIds && onlyIds.size > 0) {
    logProgress(`  --ids= filter: ${onlyIds.size} spell id(s) only`);
  }
  if (maxRows < Infinity) {
    logProgress(`  --max=${maxRows} caps enrichment attempts (each missing/all row = one attempt).`);
  }

  for (const row of mounts) {
    const id = row?.id;
    if (typeof id !== "number" || !Number.isFinite(id)) continue;

    if (onlyIds && onlyIds.size > 0 && !onlyIds.has(id)) {
      continue;
    }

    if (!all && row.iconFileId != null) {
      report.skippedAlreadyHasIcon += 1;
      continue;
    }

    if (maxRows < Infinity && report.attempts >= maxRows) break;

    report.attempts += 1;
    let data = readEnrichCache(id, cacheTtlSec, forceRefresh);
    let didNetworkFetch = false;
    try {
      if (!data) {
        didNetworkFetch = true;
        data = await fetchSpellEnrichment(id, {
          apiHost,
          region,
          headers,
          // Throttle once per row in `finally` so spell **404** paths don’t machine-gun the API.
          delayAfterOkMs: 0,
        });
        writeEnrichCache(id, data);
      }
    } catch (e) {
      const reason = e.message || String(e);
      report.failures.push({ id, reason });
      if (strict) {
        console.error(`[data:enrich-metadata] STRICT fail at spell ${id}: ${reason}`);
        process.exit(1);
      }
      if (report.attempts % 10 === 0) {
        logProgress(`  …attempts ${report.attempts} (${report.successes} OK, ${report.failures.length} failed)`);
      }
      continue;
    } finally {
      if (didNetworkFetch && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    report.successes += 1;

    if (data.iconFileId != null) {
      row.iconFileId = data.iconFileId;
      report.iconFilled += 1;
    }
    if (typeof data.iconUrl === "string" && data.iconUrl) {
      row.iconUrl = data.iconUrl;
    }

    if (
      typeof data.spellName === "string" &&
      data.spellName &&
      typeof row.name === "string" &&
      row.name &&
      data.spellName !== row.name
    ) {
      report.nameMismatches.push({
        id,
        journalOrRowName: row.name,
        spellApiName: data.spellName,
      });
    }

    if (report.attempts % 10 === 0 || report.successes === 1) {
      logProgress(
        `  …attempts ${report.attempts}/${maxRows === Infinity ? "∞" : maxRows} (${report.successes} OK)`,
      );
    }
  }

  writeFileSync(
    mountsPath,
    JSON.stringify(mounts, null, 2) + "\n",
    "utf8",
  );

  const reportPath = join(root, "data", "build", "metadata-enrich-report.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(
    reportPath,
    JSON.stringify(report, null, 2) + "\n",
    "utf8",
  );

  console.log(`\n[data:enrich-metadata] OK`);
  console.log(`  Enrichment attempts: ${report.attempts} (${report.successes} OK)`);
  console.log(`  iconFileId set/updated: ${report.iconFilled}`);
  console.log(`  Skipped (already had icon): ${report.skippedAlreadyHasIcon}`);
  console.log(`  Spell vs row name mismatches (for spot-check): ${report.nameMismatches.length}`);
  console.log(`  Failures: ${report.failures.length}`);
  console.log(`  Report → ${reportPath}`);
  console.log(`  Updated → ${mountsPath}\n`);
}

main().catch((e) => {
  console.error("[data:enrich-metadata] ERROR", e.message || e);
  process.exit(2);
});
