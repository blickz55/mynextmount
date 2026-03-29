/**
 * Batch-generate Archivist hover lore → data/mount-hover-lore.json (static; no live API on hover).
 *
 * Usage:
 *   npm run content:mount-hover-lore-batch -- --spell-id=458 --dry-run
 *   npm run content:mount-hover-lore-batch -- --limit=20 --only-missing --apply
 *   npm run content:mount-hover-lore-batch -- --limit=0 --only-missing --apply   # full catalog missing rows
 *   npm run content:mount-hover-lore-batch -- --spell-ids=1,2,3 --lore-force --apply
 *
 * Env (first match wins for API key):
 *   MOUNT_HOVER_LORE_OPENAI_API_KEY | MOUNT_LORE_OPENAI_API_KEY | OPENAI_API_KEY | FARM_TIP_OPENAI_API_KEY | …
 *   MOUNT_HOVER_LORE_LLM_MODEL (default gpt-5.4-mini)
 *   MOUNT_HOVER_LORE_REASONING_EFFORT — gpt-5.* (default none)
 *   MOUNT_HOVER_LORE_OPENAI_BASE_URL | OPENAI base fallbacks
 *   MOUNT_HOVER_LORE_LLM_DELAY_MS (default 750)
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";
import {
  buildMountHoverLoreUserPrompt,
  callOpenAIForMountHoverLore,
} from "./lib/mount-hover-lore-llm.mjs";
import { applyWowheadItemIdToMountsList } from "./lib/wowhead-item-override.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data", "build");
const batchOutPath = join(outDir, "mount-hover-lore-batch.json");
const hoverLorePath = join(root, "data", "mount-hover-lore.json");
const mountsPath = join(root, "data", "mounts.json");
const stubsPath = join(root, "data", "mounts.stubs.json");
const provenancePath = join(root, "data", "mount-hover-lore-provenance.json");

const DELAY_DEFAULT_MS = 750;

const KEY_CHAIN = [
  "MOUNT_HOVER_LORE_OPENAI_API_KEY",
  "MOUNT_LORE_OPENAI_API_KEY",
  "OPENAI_API_KEY",
  "FARM_TIP_OPENAI_API_KEY",
  "CONTENT_GUIDES_OPENAI_API_KEY",
  "WOWHEAD_DIGEST_OPENAI_API_KEY",
  "MOUNT_FLAVOR_OPENAI_API_KEY",
];

function firstKey(env) {
  for (const k of KEY_CHAIN) {
    const v = env[k]?.trim();
    if (v) return v;
  }
  return "";
}

function parseArgs(argv) {
  let maxMounts = 10;
  let limitExplicit = false;
  let offset = 0;
  let spellId = null;
  let spellIds = [];
  let spellIdsFile = null;
  let dryRun = false;
  let apply = false;
  let onlyMissing = false;
  let loreForce = false;
  let delayMs = DELAY_DEFAULT_MS;
  for (const a of argv) {
    if (a.startsWith("--limit=")) {
      limitExplicit = true;
      const n = Number(a.slice(8));
      if (n === 0) maxMounts = Infinity;
      else if (Number.isFinite(n) && n > 0) maxMounts = n;
      else maxMounts = 10;
    }
    if (a.startsWith("--offset="))
      offset = Math.max(0, Math.floor(Number(a.slice(9)) || 0));
    if (a.startsWith("--spell-id=")) spellId = Number(a.slice(11));
    if (a.startsWith("--spell-ids=")) {
      spellIds = a
        .slice(12)
        .split(/[,\s]+/)
        .map((s) => Number(String(s).trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
    if (a.startsWith("--spell-ids-file=")) {
      spellIdsFile = a.slice(17).trim() || null;
    }
    if (a === "--dry-run") dryRun = true;
    if (a === "--apply") apply = true;
    if (a === "--only-missing") onlyMissing = true;
    if (a === "--lore-force") loreForce = true;
    if (a.startsWith("--delay-ms="))
      delayMs = Math.max(0, Number(a.slice(11)) || DELAY_DEFAULT_MS);
  }
  if ((spellIds.length > 0 || spellIdsFile) && !limitExplicit) {
    maxMounts = Infinity;
  }
  return {
    maxMounts,
    offset,
    spellId,
    spellIds,
    spellIdsFile,
    dryRun,
    apply,
    onlyMissing,
    loreForce,
    delayMs,
  };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mergeCanonicalAndStubs(main, stubs) {
  if (!Array.isArray(main)) return [];
  if (!Array.isArray(stubs) || stubs.length === 0) return [...main];
  const ids = new Set(main.map((m) => m.id));
  const extra = stubs.filter((s) => s && !ids.has(s.id));
  return [...main, ...extra].sort((a, b) => a.id - b.id);
}

function rowHasLore(row) {
  return row && typeof row.lore === "string" && row.lore.trim().length >= 25;
}

function appendProvenance(entry) {
  const data = existsSync(provenancePath)
    ? loadJson(provenancePath)
    : { schemaVersion: 1, batches: [] };
  data.batches = Array.isArray(data.batches) ? data.batches : [];
  data.batches.push(entry);
  writeFileSync(provenancePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function main() {
  loadProjectEnv(root);
  const args = parseArgs(process.argv.slice(2));
  const env = process.env;

  let mounts = loadJson(mountsPath);
  if (!Array.isArray(mounts)) {
    console.error("[mount-hover-lore-batch] mounts.json must be an array.");
    process.exit(2);
  }
  if (existsSync(stubsPath)) {
    try {
      const stubs = loadJson(stubsPath);
      mounts = mergeCanonicalAndStubs(mounts, Array.isArray(stubs) ? stubs : []);
    } catch {
      console.warn("[mount-hover-lore-batch] Could not read mounts.stubs.json; using mounts.json only.");
    }
  }
  mounts = applyWowheadItemIdToMountsList(mounts, root);

  const existing = existsSync(hoverLorePath) ? loadJson(hoverLorePath) : {};

  let spellIdsList = [...args.spellIds];
  if (args.spellIdsFile) {
    const fp = isAbsolute(args.spellIdsFile)
      ? args.spellIdsFile
      : join(root, args.spellIdsFile);
    if (!existsSync(fp)) {
      console.error(`[mount-hover-lore-batch] --spell-ids-file not found: ${fp}`);
      process.exit(2);
    }
    const fromFile = readFileSync(fp, "utf8")
      .split(/[\s,]+/)
      .map((s) => Number(String(s).trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    spellIdsList = [...new Set([...spellIdsList, ...fromFile])];
  }

  let list = mounts;
  if (args.spellId && Number.isFinite(args.spellId)) {
    list = mounts.filter((m) => m.id === args.spellId);
  } else if (spellIdsList.length > 0) {
    const want = new Set(spellIdsList);
    list = mounts.filter((m) => want.has(m.id));
  }
  if (args.onlyMissing) {
    list = list.filter((m) => !rowHasLore(existing[String(m.id)]));
  }
  if (!args.spellId && spellIdsList.length === 0 && args.offset > 0) {
    list = list.slice(args.offset);
  }
  if (Number.isFinite(args.maxMounts)) {
    list = list.slice(0, args.maxMounts);
  }

  if (list.length === 0) {
    console.log("[mount-hover-lore-batch] No mounts to process.");
    process.exit(0);
  }

  const apiKey = firstKey(env);
  const baseUrl =
    env.MOUNT_HOVER_LORE_OPENAI_BASE_URL?.trim() ||
    env.MOUNT_LORE_OPENAI_BASE_URL?.trim() ||
    env.OPENAI_BASE_URL?.trim() ||
    env.FARM_TIP_OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1";
  const model =
    env.MOUNT_HOVER_LORE_LLM_MODEL?.trim() || "gpt-5.4-mini";
  const reasoningEffort =
    (env.MOUNT_HOVER_LORE_REASONING_EFFORT || "").trim() || "none";

  console.log(
    `[mount-hover-lore-batch] Processing ${list.length} mount(s) model=${model}${args.dryRun ? " (dry-run)" : ""}`,
  );

  mkdirSync(outDir, { recursive: true });

  const asOf = new Date().toISOString().slice(0, 10);
  const newRows = {};
  const errors = [];
  let merged =
    args.apply && !args.dryRun ? { ...existing } : null;

  for (let i = 0; i < list.length; i++) {
    const mount = list[i];
    const sid = mount.id;

    if (!args.loreForce && rowHasLore(existing[String(sid)])) {
      console.log(`  skip ${sid} (already has lore; use --lore-force)`);
      continue;
    }

    if (args.dryRun) {
      console.log(`  [dry-run] ${sid} ${mount.name}`);
      continue;
    }

    if (!apiKey) {
      console.error(
        "[mount-hover-lore-batch] Set OPENAI_API_KEY or MOUNT_HOVER_LORE_OPENAI_API_KEY in .env.local",
      );
      process.exit(2);
    }

    try {
      const user = buildMountHoverLoreUserPrompt(mount);
      const { lore } = await callOpenAIForMountHoverLore({
        apiKey,
        baseUrl,
        model,
        user,
        reasoningEffort,
      });
      const row = { lore, asOf, model };
      newRows[String(sid)] = row;
      if (merged) {
        merged[String(sid)] = row;
        writeFileSync(
          hoverLorePath,
          JSON.stringify(merged, null, 2) + "\n",
          "utf8",
        );
      }
      console.log(`  OK ${sid} ${mount.name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ spellId: sid, error: msg });
      console.error(`  FAIL ${sid}: ${msg.split("\n")[0]}`);
    }

    if (i < list.length - 1 && args.delayMs > 0) await sleep(args.delayMs);
  }

  if (args.dryRun) {
    console.log("[mount-hover-lore-batch] Dry-run complete.");
    process.exit(0);
  }

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model,
    sourceNote:
      "OpenAI Archivist hover lore from mounts.json metadata; batch script; no Wowhead scraping.",
    rows: newRows,
  };
  writeFileSync(batchOutPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[mount-hover-lore-batch] Wrote ${batchOutPath}`);

  appendProvenance({
    at: payload.generatedAt,
    model,
    apply: Boolean(args.apply),
    spellIds: Object.keys(newRows).map(Number),
    errors,
  });

  if (args.apply && Object.keys(newRows).length > 0 && merged) {
    console.log(`[mount-hover-lore-batch] Saved to ${hoverLorePath} (incremental)`);
  } else if (args.apply && Object.keys(newRows).length > 0 && !merged) {
    const out = { ...existing };
    for (const [k, v] of Object.entries(newRows)) out[k] = v;
    writeFileSync(hoverLorePath, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log(`[mount-hover-lore-batch] Merged into ${hoverLorePath}`);
  }

  if (errors.length) {
    console.error(
      `[mount-hover-lore-batch] ${errors.length} error(s); see ${provenancePath}`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
