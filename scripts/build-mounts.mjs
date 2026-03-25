/**
 * Epic B.2 — Authoritative `data/mounts.json` from Blizzard mount API + overrides.
 *
 * Usage:
 *   npm run data:build
 *   npm run data:build -- --max=60   (note `--` so npm forwards flags)
 *   (loads .env / .env.local like other data scripts)
 *
 * Options:
 *   --max=N              Cap detail fetches (dev only; output incomplete)
 *   --force-refresh      Ignore cache TTL and refetch every mount detail
 *
 * Env:
 *   BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET (required)
 *   BLIZZARD_REGION      us | eu | kr | tw (default us)
 *   BUILD_FETCH_DELAY_MS polite delay after each successful detail (default 1000)
 *   BUILD_CACHE_TTL_SECONDS on-disk cache TTL under data/build/cache/ (default 86400)
 *   BUILD_AS_OF_PATCH    optional string stored in manifest gameVersion hint
 */

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";
import {
  apiHostForRegion,
  fetchAllMountHrefs,
  fetchWithRetry,
  getAccessToken,
  mountIdFromHref,
} from "./lib/blizzard-mount.mjs";
import { pickDisplayString } from "./lib/api-display-string.mjs";
import {
  loadMountToSpellMap,
  summonSpellIdForMount,
} from "./lib/mount-spell-map.mjs";
import {
  mountDetailCachePath,
  readMountDetailCache,
  writeMountDetailCache,
} from "./lib/mount-detail-cache.mjs";
import {
  loadOverridesMap,
  applyRowOverride,
} from "./lib/overrides.mjs";
import { applyScoringHeuristics } from "./lib/scoring-heuristics.mjs";
import { applyDefaultLocation } from "./lib/location-default.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function logProgress(msg) {
  process.stderr.write(`${msg}\n`);
}

function loadJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

/**
 * Blizzard mount detail JSON has no stable "unobtainable in Retail" flag.
 * (`should_exclude_if_uncollected` is not equivalent — many farmable mounts set it.)
 * Curated false values live in `data/overrides/retail-unobtainable.json`.
 */
function defaultMountFromApi(spellId, detail, asOfPatch) {
  const name =
    pickDisplayString(detail.name) || `Mount (spell ${spellId})`;
  const st =
    typeof detail.source?.type === "string" ? detail.source.type : undefined;
  const sn = pickDisplayString(detail.source?.name);
  let source = "Retail — Blizzard Game Data API";
  if (st || sn) {
    const parts = [st, sn].filter(Boolean);
    if (parts.length) source = parts.join(" — ");
  }
  const row = {
    id: spellId,
    name,
    source,
    location: "Unknown",
    dropRate: 0.02,
    difficulty: 2,
    timeToComplete: 30,
    lockout: "none",
    expansion: "Unknown",
    tags: [],
    wowheadUrl: `https://www.wowhead.com/spell=${spellId}`,
    commentsUrl: `https://www.wowhead.com/spell=${spellId}#comments`,
    retailObtainable: true,
    asOfPatch,
  };
  if (typeof st === "string" && st) {
    row.sourceCategory = st.toLowerCase();
  }
  applyScoringHeuristics(row);
  applyDefaultLocation(row);
  return row;
}

async function main() {
  const args = process.argv.slice(2);
  let maxMounts = Infinity;
  let forceRefresh = false;
  for (const a of args) {
    if (a.startsWith("--max=")) {
      maxMounts = Number(a.slice(6)) || 0;
    } else if (a === "--force-refresh") {
      forceRefresh = true;
    }
  }

  loadProjectEnv(root);

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = (process.env.BLIZZARD_REGION || "us").toLowerCase();
  const delayMs = Number(process.env.BUILD_FETCH_DELAY_MS || 1000);
  const cacheTtlSec = Number(process.env.BUILD_CACHE_TTL_SECONDS || 86400);
  const asOfPatch =
    process.env.BUILD_AS_OF_PATCH || `retail-static-${region}`;

  if (!clientId || !clientSecret) {
    console.error(
      "[data:build] Missing BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET.",
    );
    console.error("  Set them in .env.local (see .env.example).\n");
    process.exit(1);
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

  const overridesDir = join(root, "data", "overrides");
  const overridesById = loadOverridesMap(overridesDir);

  const mountToSpell = loadMountToSpellMap(root);
  if (!mountToSpell) {
    console.error(
      "[data:build] Missing data/baseline/mount-to-summon-spell.json",
    );
    console.error(
      "  Run: npm run data:ingest-mount-map\n  (Retail mount API 12.x no longer includes spell linkage in JSON.)\n",
    );
    process.exit(1);
  }

  const apiHost = apiHostForRegion(region);
  const namespace = `static-${region}`;
  const token = await getAccessToken(clientId, clientSecret);
  const headers = { Authorization: `Bearer ${token}` };

  logProgress(`[data:build] Mount index (${namespace})…`);
  const mountHrefs = await fetchAllMountHrefs(apiHost, namespace, headers);
  logProgress(
    `  Index entries: ${mountHrefs.length} (detail progress every 10 → stderr)`,
  );

  const bySpellId = new Map();
  let skippedExcluded = 0;
  let detailsLoaded = 0;
  const failures = [];

  for (const href of mountHrefs) {
    if (detailsLoaded >= maxMounts) break;

    const mountNumericId = mountIdFromHref(href);
    if (!mountNumericId) {
      failures.push({ href, reason: "could not parse mount id from href" });
      continue;
    }

    const cpath = mountDetailCachePath(root, mountNumericId);
    let detail = readMountDetailCache(cpath, cacheTtlSec, forceRefresh);

    try {
      if (!detail) {
        const res = await fetchWithRetry(
          href,
          { headers },
          { delayAfterOkMs: delayMs },
        );
        detail = await res.json();
        writeMountDetailCache(cpath, detail);
      }
    } catch (e) {
      failures.push({ href, reason: e.message || String(e) });
      continue;
    }

    const spellId = summonSpellIdForMount(
      detail,
      mountNumericId,
      mountToSpell,
    );
    if (spellId == null) {
      failures.push({
        href,
        reason: `no summon spell id for mount ${mountNumericId} (API + Mount.db2 map)`,
      });
      continue;
    }

    detailsLoaded += 1;

    if (excluded.has(spellId)) {
      skippedExcluded += 1;
      continue;
    }

    if (bySpellId.has(spellId)) {
      const prev = bySpellId.get(spellId);
      console.warn(
        `[data:build] WARN duplicate spell ${spellId}: keeping first row (${prev.name}), skipping mount ${mountNumericId}`,
      );
      continue;
    }

    const row = defaultMountFromApi(spellId, detail, asOfPatch);
    applyRowOverride(row, overridesById.get(spellId));
    bySpellId.set(spellId, row);

    const cap = Math.min(mountHrefs.length, maxMounts);
    if (detailsLoaded === 1 || detailsLoaded % 10 === 0) {
      logProgress(
        `  …details ${detailsLoaded}/${cap} OK (${bySpellId.size} unique spells in output)`,
      );
    }
  }

  if (failures.length) {
    console.error(`\n[data:build] FAIL — ${failures.length} mount detail error(s):`);
    for (const f of failures.slice(0, 20)) {
      console.error(`  ${f.reason}\n    ${f.href}`);
    }
    if (failures.length > 20) {
      console.error(`  …and ${failures.length - 20} more`);
    }
    console.error(
      "\n  Fix network/API issues or retry; governance disallows silent partial output.\n",
    );
    process.exit(1);
  }

  if (maxMounts < mountHrefs.length) {
    console.warn(
      `\n[data:build] NOTE: --max=${maxMounts} — output is incomplete (not for baseline commit).`,
    );
  }

  const mounts = [...bySpellId.values()].sort((a, b) => a.id - b.id);
  const outPath = join(root, "data", "mounts.json");
  writeFileSync(outPath, JSON.stringify(mounts, null, 2) + "\n", "utf8");

  const generatedAt = new Date().toISOString();
  const manifest = {
    schemaVersion: 1,
    generatedAt,
    gameVersion: asOfPatch,
    gitCommit: process.env.GITHUB_SHA || process.env.GIT_COMMIT || undefined,
    notes:
      "Epic B.2 + B.5 — Blizzard mount API + mount-to-summon-spell map + sourceCategory scoring heuristics + data/overrides/*.json (incl. retail-unobtainable) + per-row asOfPatch",
    rowCount: mounts.length,
    spellIdCount: mounts.length,
    excludedSkipped: skippedExcluded,
    sources: [
      {
        tier: 1,
        name: "Blizzard Game Data API",
        endpointOrNote: `/data/wow/mount/index + per-mount detail (${namespace})`,
        retrievedAt: generatedAt,
      },
    ],
    settings: {
      region,
      namespace,
      defaultRequestsPerSecondPerHost: 1,
      buildFetchDelayMs: delayMs,
      cacheTtlSeconds: cacheTtlSec,
      forceRefresh,
      maxMountsCap:
        maxMounts < mountHrefs.length ? maxMounts : undefined,
    },
  };

  const manifestPath = join(root, "data", "build", "harvest-manifest.json");
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  console.log(`\n[data:build] OK — wrote ${mounts.length} rows → data/mounts.json`);
  console.log(`  Manifest → data/build/harvest-manifest.json`);
  console.log(`  Catalog exceptions skipped: ${skippedExcluded}\n`);
}

main().catch((e) => {
  console.error("[data:build] ERROR", e.message || e);
  process.exit(2);
});
