/**
 * LLM-generated micro acquisition bullets → data/wowhead-comment-digests.json.
 * Uses mounts.json metadata only (no Wowhead scraping). See docs/wowhead-digests.md.
 *
 * Usage:
 *   npm run content:mount-flavor-batch -- --spell-id=6648 --dry-run
 *   npm run content:mount-flavor-batch -- --limit=5 --only-missing --apply
 *   npm run content:mount-flavor-batch -- --offset=500 --limit=200 --flavor-force --apply
 *   npm run content:mount-flavor-batch -- --spell-ids=353875,353884 --flavor-force --apply
 *   npm run content:mount-flavor-batch -- --spell-ids-file=data/build/mount-flavor-failed-spell-ids.txt --flavor-force --apply
 *   (--spell-ids / --spell-ids-file without --limit processes every listed id; default --limit=10 applies only to full-list runs.)
 *
 * Env (first match wins):
 *   MOUNT_FLAVOR_OPENAI_API_KEY | WOWHEAD_DIGEST_OPENAI_API_KEY | FARM_TIP_OPENAI_API_KEY | OPENAI_API_KEY
 *   MOUNT_FLAVOR_LLM_MODEL | WOWHEAD_DIGEST_LLM_MODEL | FARM_TIP_LLM_MODEL (default gpt-5.4)
 *   MOUNT_FLAVOR_REASONING_EFFORT — gpt-5.* only (default none; avoids empty output when reasoning eats the token budget)
 *   MOUNT_FLAVOR_MAX_OUTPUT_TOKENS — floor 2048 if set (default 8192 base; retries double up to 32k)
 *   MOUNT_FLAVOR_OPENAI_BASE_URL | WOWHEAD_DIGEST_OPENAI_BASE_URL | FARM_TIP_OPENAI_BASE_URL
 *   MOUNT_FLAVOR_LLM_DELAY_MS (default 900)
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
  buildMountFlavorUserPrompt,
  callOpenAIForMountFlavor,
} from "./lib/mount-flavor-llm.mjs";
import { applyWowheadItemIdToMountsList } from "./lib/wowhead-item-override.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data", "build");
const batchOutPath = join(outDir, "mount-flavor-batch.json");
const digestsPath = join(root, "data", "wowhead-comment-digests.json");
const mountsPath = join(root, "data", "mounts.json");
const provenancePath = join(root, "data", "mount-flavor-provenance.json");

const DELAY_DEFAULT_MS = 900;

function parseArgs(argv) {
  let maxMounts = 10;
  /** True when user passed `--limit=` (default cap 10 must not apply to `--spell-ids`). */
  let limitExplicit = false;
  let offset = 0;
  let spellId = null;
  /** @type {number[]} */
  let spellIds = [];
  /** @type {string | null} */
  let spellIdsFile = null;
  let dryRun = false;
  let apply = false;
  let onlyMissing = false;
  let flavorForce = false;
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
      const raw = a.slice(12);
      if (raw.includes("...")) {
        console.error(
          "[mount-flavor-batch] `--spell-ids` must list every id (no `...`). Use the full comma-separated list or:\n" +
            "  --spell-ids-file=data/build/mount-flavor-failed-spell-ids.txt",
        );
        process.exit(2);
      }
      spellIds = raw
        .split(/[,\s]+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
    if (a.startsWith("--spell-ids-file=")) {
      spellIdsFile = a.slice(17).trim() || null;
    }
    if (a === "--dry-run") dryRun = true;
    if (a === "--apply") apply = true;
    if (a === "--only-missing") onlyMissing = true;
    if (a === "--flavor-force") flavorForce = true;
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
    flavorForce,
    delayMs,
  };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function digestRowHasContent(row) {
  if (!row || typeof row !== "object") return false;
  const flavor = typeof row.flavor === "string" && row.flavor.trim();
  const lines = Array.isArray(row.lines) && row.lines.some((s) => String(s).trim());
  return Boolean(flavor || lines);
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
    console.error("[mount-flavor-batch] mounts.json must be an array.");
    process.exit(2);
  }
  mounts = applyWowheadItemIdToMountsList(mounts, root);

  const existingDigests = existsSync(digestsPath) ? loadJson(digestsPath) : {};

  /** @type {number[]} */
  let spellIdsList = [...args.spellIds];
  if (args.spellIdsFile) {
    const fp = isAbsolute(args.spellIdsFile)
      ? args.spellIdsFile
      : join(root, args.spellIdsFile);
    if (!existsSync(fp)) {
      console.error(`[mount-flavor-batch] --spell-ids-file not found: ${fp}`);
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
    list = list.filter((m) => {
      const row = existingDigests[String(m.id)];
      return !digestRowHasContent(row);
    });
  }
  if (!args.spellId && spellIdsList.length === 0 && args.offset > 0) {
    list = list.slice(args.offset);
  }
  if (Number.isFinite(args.maxMounts)) {
    list = list.slice(0, args.maxMounts);
  }

  if (list.length === 0) {
    console.log("[mount-flavor-batch] No mounts to process.");
    process.exit(0);
  }

  const apiKey =
    env.MOUNT_FLAVOR_OPENAI_API_KEY ||
    env.WOWHEAD_DIGEST_OPENAI_API_KEY ||
    env.FARM_TIP_OPENAI_API_KEY ||
    env.OPENAI_API_KEY ||
    "";
  const baseUrl =
    env.MOUNT_FLAVOR_OPENAI_BASE_URL ||
    env.WOWHEAD_DIGEST_OPENAI_BASE_URL ||
    env.FARM_TIP_OPENAI_BASE_URL ||
    "https://api.openai.com/v1";
  const model =
    env.MOUNT_FLAVOR_LLM_MODEL ||
    env.WOWHEAD_DIGEST_LLM_MODEL ||
    env.FARM_TIP_LLM_MODEL ||
    "gpt-5.4";
  const reasoningEffort =
    (env.MOUNT_FLAVOR_REASONING_EFFORT || "").trim() || "none";

  console.log(
    `[mount-flavor-batch] Processing ${list.length} mount(s)${args.dryRun ? " (dry-run)" : ""}`,
  );

  mkdirSync(outDir, { recursive: true });

  const digestAsOf = new Date().toISOString().slice(0, 10);
  const newRows = {};
  const errors = [];
  /** When applying, merge after each mount so a long run survives interruption. */
  let digestMerged =
    args.apply && !args.dryRun ? { ...existingDigests } : null;

  for (let i = 0; i < list.length; i++) {
    const mount = list[i];
    const sid = mount.id;

    if (
      !args.flavorForce &&
      digestRowHasContent(existingDigests[String(sid)])
    ) {
      console.log(`  skip ${sid} (digest already has flavor/lines; use --flavor-force)`);
      continue;
    }

    if (args.dryRun) {
      console.log(`  [dry-run] ${sid} ${mount.name}`);
      continue;
    }

    if (!apiKey) {
      console.error(
        "[mount-flavor-batch] Set OPENAI_API_KEY or MOUNT_FLAVOR_OPENAI_API_KEY in .env.local",
      );
      process.exit(2);
    }

    try {
      const user = buildMountFlavorUserPrompt(mount);
      const { flavor, lines } = await callOpenAIForMountFlavor({
        apiKey,
        baseUrl,
        model,
        user,
        reasoningEffort,
      });
      const row = {
        asOf: digestAsOf,
        flavor: flavor || "",
        lines,
      };
      newRows[String(sid)] = row;
      if (digestMerged) {
        digestMerged[String(sid)] = {
          ...(digestMerged[String(sid)] || {}),
          ...row,
        };
        writeFileSync(
          digestsPath,
          JSON.stringify(digestMerged, null, 2) + "\n",
          "utf8",
        );
      }
      console.log(`  OK ${sid} ${mount.name} (${lines.length} bullets)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ spellId: sid, error: msg });
      console.error(`  FAIL ${sid}: ${msg.split("\n")[0]}`);
    }

    if (i < list.length - 1 && args.delayMs > 0) await sleep(args.delayMs);
  }

  if (args.dryRun) {
    console.log("[mount-flavor-batch] Dry-run complete (no files written).");
    process.exit(0);
  }

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model,
    sourceNote:
      "OpenAI micro acquisition bullets (≤5 lines, ≤10 words each) from mounts.json metadata; Responses API for gpt-5.*; no Wowhead scraping.",
    digests: newRows,
  };

  writeFileSync(batchOutPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`[mount-flavor-batch] Wrote ${batchOutPath}`);

  appendProvenance({
    at: payload.generatedAt,
    model,
    apply: Boolean(args.apply),
    spellIds: Object.keys(newRows).map(Number),
    errors,
  });

  if (args.apply && Object.keys(newRows).length > 0) {
    if (digestMerged) {
      console.log(`[mount-flavor-batch] Digest updates saved incrementally to ${digestsPath}`);
    } else {
      const merged = { ...existingDigests };
      for (const [k, v] of Object.entries(newRows)) {
        merged[k] = { ...(merged[k] || {}), ...v };
      }
      writeFileSync(digestsPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
      console.log(`[mount-flavor-batch] Merged into ${digestsPath}`);
    }
  }

  if (errors.length) {
    console.error(`[mount-flavor-batch] ${errors.length} error(s); see ${provenancePath}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
