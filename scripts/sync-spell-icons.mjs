/**
 * Epic B.8 — Spell icons from DB2 exports (Tier 2): SpellMisc + listfile → Blizzard render URLs.
 *
 * 1. Download (or reuse cache): Wago Tools SpellMisc CSV, wowdev/wow-listfile community CSV.
 * 2. Stream join: mount summon spell IDs from data/mounts.json → SpellIconFileDataID → texture basename.
 * 3. Write data/baseline/spell-icon-textures.json (catalog subset + provenance).
 * 4. Merge data/mount-icon-overrides.json for rows that still lack iconUrl on the mount row
 *    (does not overwrite existing override URLs unless --force-overrides).
 *
 * Usage:
 *   npm run data:sync-spell-icons
 *   npm run data:sync-spell-icons -- --dry-run
 *   npm run data:sync-spell-icons -- --map-only
 *
 * Env:
 *   BLIZZARD_REGION           us | eu | … (default us) — used in render URL host path
 *   SPELL_MISC_CSV_URL        default https://wago.tools/db2/SpellMisc/csv
 *   SPELL_ICON_LISTFILE_URL   default wow-listfile latest community CSV
 *   SPELL_ICON_CACHE_TTL_SEC  default 604800 (7d) for cached downloads
 */

import {
  createReadStream,
  mkdirSync,
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

import { loadProjectEnv } from "./lib/project-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const DEFAULT_SPELL_MISC_URL = "https://wago.tools/db2/SpellMisc/csv";
const DEFAULT_LISTFILE_URL =
  "https://github.com/wowdev/wow-listfile/releases/latest/download/community-listfile.csv";

const CACHE_DIR = join(root, "data", "build", "cache", "spell-icon-map");
const BASELINE_PATH = join(root, "data", "baseline", "spell-icon-textures.json");
const OVERRIDES_PATH = join(root, "data", "mount-icon-overrides.json");
const REPORT_PATH = join(root, "data", "build", "spell-icon-sync-report.json");

function log(msg) {
  process.stderr.write(`${msg}\n`);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isCacheFresh(path, ttlSec) {
  if (!existsSync(path)) return false;
  const age = (Date.now() - statSync(path).mtimeMs) / 1000;
  return age < ttlSec;
}

async function downloadToFile(url, dest, { ttlSec }) {
  mkdirSync(dirname(dest), { recursive: true });
  if (isCacheFresh(dest, ttlSec)) {
    log(`[sync-spell-icons] Using cached ${dest}`);
    return;
  }
  log(`[sync-spell-icons] Downloading ${url} → ${dest}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  const tmp = `${dest}.part`;
  await pipeline(res.body, createWriteStream(tmp));
  renameSync(tmp, dest);
}

/** @returns {Promise<Map<number, { primary: number, active: number }>>} */
async function loadSpellMiscForSpells(spellIdSet, spellMiscPath) {
  const rl = createInterface({
    input: createReadStream(spellMiscPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let headerIdx = {
    spellIcon: -1,
    activeIcon: -1,
    spellId: -1,
  };
  let lineNo = 0;
  const bySpell = new Map();
  for await (const line of rl) {
    lineNo += 1;
    if (lineNo === 1) {
      const cols = line.split(",");
      headerIdx.spellIcon = cols.indexOf("SpellIconFileDataID");
      headerIdx.activeIcon = cols.indexOf("ActiveIconFileDataID");
      headerIdx.spellId = cols.indexOf("SpellID");
      if (
        headerIdx.spellIcon < 0 ||
        headerIdx.activeIcon < 0 ||
        headerIdx.spellId < 0
      ) {
        throw new Error("SpellMisc CSV missing expected columns");
      }
      continue;
    }
    if (!line.trim()) continue;
    const cols = line.split(",");
    const sid = Number(cols[headerIdx.spellId]);
    if (!spellIdSet.has(sid)) continue;
    const primary = Number(cols[headerIdx.spellIcon]) || 0;
    const active = Number(cols[headerIdx.activeIcon]) || 0;
    bySpell.set(sid, { primary, active });
  }
  return bySpell;
}

function pickFileDataId({ primary, active }) {
  if (primary > 0) return primary;
  if (active > 0) return active;
  return 0;
}

function textureBaseFromListfilePath(path) {
  const base = path.split("/").pop() || "";
  return base.replace(/\.blp$/i, ".jpg").toLowerCase();
}

/** @param {Set<number>} neededIds */
async function loadListfileBasenames(listfilePath, neededIds) {
  const rl = createInterface({
    input: createReadStream(listfilePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  const out = new Map();
  for await (const line of rl) {
    const semi = line.indexOf(";");
    if (semi <= 0) continue;
    const id = Number(line.slice(0, semi));
    if (!neededIds.has(id)) continue;
    const rel = line.slice(semi + 1).trim();
    if (!rel) continue;
    out.set(id, textureBaseFromListfilePath(rel));
  }
  return out;
}

function renderIconUrl(region, textureBase) {
  const r = String(region || "us").toLowerCase();
  const file = textureBase.endsWith(".jpg") ? textureBase : `${textureBase}.jpg`;
  return `https://render.worldofwarcraft.com/${r}/icons/56/${file}`;
}

async function main() {
  loadProjectEnv(root);

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const mapOnly = args.includes("--map-only");
  const forceOverrides = args.includes("--force-overrides");

  const region = process.env.BLIZZARD_REGION || "us";
  const miscUrl = process.env.SPELL_MISC_CSV_URL || DEFAULT_SPELL_MISC_URL;
  const listUrl =
    process.env.SPELL_ICON_LISTFILE_URL || DEFAULT_LISTFILE_URL;
  const ttlSec = Number(process.env.SPELL_ICON_CACHE_TTL_SEC || 604800);

  const spellMiscCached = join(CACHE_DIR, "SpellMisc.csv");
  const listfileCached = join(CACHE_DIR, "community-listfile.csv");

  if (!dryRun) {
    mkdirSync(CACHE_DIR, { recursive: true });
    mkdirSync(dirname(BASELINE_PATH), { recursive: true });
  }

  await downloadToFile(miscUrl, spellMiscCached, { ttlSec });
  await downloadToFile(listUrl, listfileCached, { ttlSec });

  const mounts = loadJson(join(root, "data", "mounts.json"));
  const spellIdSet = new Set(mounts.map((m) => m.id));

  log(`[sync-spell-icons] Mount rows: ${mounts.length} unique spell ids`);

  const miscBySpell = await loadSpellMiscForSpells(spellIdSet, spellMiscCached);

  const neededFileIds = new Set();
  const fileIdPerSpell = new Map();
  for (const sid of spellIdSet) {
    const row = miscBySpell.get(sid);
    if (!row) continue;
    const fid = pickFileDataId(row);
    if (fid <= 0) continue;
    fileIdPerSpell.set(sid, fid);
    neededFileIds.add(fid);
  }

  log(
    `[sync-spell-icons] SpellMisc matched ${miscBySpell.size}/${spellIdSet.size} spells; ${neededFileIds.size} file data ids to resolve`,
  );

  const basenameByFid = await loadListfileBasenames(listfileCached, neededFileIds);

  const spellIcons = {};
  const missingMisc = [];
  const missingListfile = [];
  const zeroIcon = [];

  for (const sid of [...spellIdSet].sort((a, b) => a - b)) {
    const miscRow = miscBySpell.get(sid);
    if (!miscRow) {
      missingMisc.push(sid);
      continue;
    }
    const fid = pickFileDataId(miscRow);
    if (fid <= 0) {
      zeroIcon.push(sid);
      continue;
    }
    const base = basenameByFid.get(fid);
    if (!base) {
      missingListfile.push({ spellId: sid, fileDataId: fid });
      continue;
    }
    const iconUrl = renderIconUrl(region, base);
    spellIcons[String(sid)] = {
      fileDataId: fid,
      textureFile: base,
      iconUrl,
    };
  }

  const baselineDoc = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    region,
    sources: [
      { name: "Wago Tools SpellMisc CSV", url: miscUrl },
      { name: "wowdev/wow-listfile community-listfile.csv", url: listUrl },
    ],
    spellIcons,
    stats: {
      catalogSpellIds: spellIdSet.size,
      resolved: Object.keys(spellIcons).length,
      missingSpellMiscRow: missingMisc.length,
      zeroIconFileDataId: zeroIcon.length,
      missingListfileEntry: missingListfile.length,
    },
  };

  if (!dryRun) {
    writeFileSync(
      BASELINE_PATH,
      JSON.stringify(baselineDoc, null, 2) + "\n",
      "utf8",
    );
    log(`[sync-spell-icons] Wrote ${BASELINE_PATH}`);
  } else {
    log(`[sync-spell-icons] Dry-run: would write baseline (${Object.keys(spellIcons).length} spells)`);
  }

  if (mapOnly) {
    writeFileSync(
      REPORT_PATH,
      JSON.stringify(
        {
          dryRun,
          mapOnly: true,
          ...baselineDoc.stats,
          sampleMissingListfile: missingListfile.slice(0, 30),
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    log(`[sync-spell-icons] Report → ${REPORT_PATH}`);
    process.exit(0);
  }

  const overrides = existsSync(OVERRIDES_PATH)
    ? loadJson(OVERRIDES_PATH)
    : {};
  let added = 0;
  let skippedHasMountIcon = 0;
  let skippedExistingOverride = 0;
  let updated = 0;

  for (const m of mounts) {
    const sid = m.id;
    const entry = spellIcons[String(sid)];
    if (!entry) continue;

    const hasRowIcon =
      typeof m.iconUrl === "string" && /^https?:\/\//i.test(m.iconUrl.trim());
    if (hasRowIcon) {
      skippedHasMountIcon += 1;
      continue;
    }

    const key = String(sid);
    const cur = overrides[key];
    const curUrl =
      cur && typeof cur.iconUrl === "string" ? cur.iconUrl.trim() : "";
    if (curUrl && !forceOverrides) {
      skippedExistingOverride += 1;
      continue;
    }
    if (curUrl === entry.iconUrl) {
      skippedExistingOverride += 1;
      continue;
    }

    if (!dryRun) {
      overrides[key] = { iconUrl: entry.iconUrl };
    }
    if (curUrl) updated += 1;
    else added += 1;
  }

  const sortedKeys = Object.keys(overrides).sort((a, b) => Number(a) - Number(b));
  const sortedOverrides = {};
  for (const k of sortedKeys) sortedOverrides[k] = overrides[k];

  if (!dryRun) {
    writeFileSync(
      OVERRIDES_PATH,
      JSON.stringify(sortedOverrides, null, 2) + "\n",
      "utf8",
    );
    log(`[sync-spell-icons] Wrote ${OVERRIDES_PATH}`);
  } else {
    log(
      `[sync-spell-icons] Dry-run: would add ${added} override(s), update ${updated}, skip row-has-icon ${skippedHasMountIcon}, skip keep-override ${skippedExistingOverride}`,
    );
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        dryRun,
        region,
        ...baselineDoc.stats,
        overrides: {
          added,
          updated,
          skippedHasMountIcon,
          skippedExistingOverride,
        },
        missingMiscSample: missingMisc.slice(0, 40),
        zeroIconSample: zeroIcon.slice(0, 40),
        missingListfileSample: missingListfile.slice(0, 40),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  log(`[sync-spell-icons] Report → ${REPORT_PATH}`);
  log("[sync-spell-icons] OK");
}

main().catch((e) => {
  console.error("[sync-spell-icons] ERROR", e.message || e);
  process.exit(2);
});
