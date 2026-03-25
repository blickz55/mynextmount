/**
 * LLM-generated mount flavor + acquisition bullets → data/wowhead-comment-digests.json.
 * Uses mounts.json metadata only (no Wowhead scraping). See docs/wowhead-digests.md.
 *
 * Usage:
 *   npm run content:mount-flavor-batch -- --spell-id=6648 --dry-run
 *   npm run content:mount-flavor-batch -- --limit=5 --only-missing --apply
 *
 * Env (first match wins):
 *   MOUNT_FLAVOR_OPENAI_API_KEY | WOWHEAD_DIGEST_OPENAI_API_KEY | FARM_TIP_OPENAI_API_KEY | OPENAI_API_KEY
 *   MOUNT_FLAVOR_LLM_MODEL | WOWHEAD_DIGEST_LLM_MODEL | FARM_TIP_LLM_MODEL (default gpt-4o-mini)
 *   MOUNT_FLAVOR_OPENAI_BASE_URL | WOWHEAD_DIGEST_OPENAI_BASE_URL | FARM_TIP_OPENAI_BASE_URL
 *   MOUNT_FLAVOR_LLM_DELAY_MS (default 900)
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
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
  let spellId = null;
  let dryRun = false;
  let apply = false;
  let onlyMissing = false;
  let flavorForce = false;
  let delayMs = DELAY_DEFAULT_MS;
  for (const a of argv) {
    if (a.startsWith("--limit=")) {
      const n = Number(a.slice(8));
      if (n === 0) maxMounts = Infinity;
      else if (Number.isFinite(n) && n > 0) maxMounts = n;
      else maxMounts = 10;
    }
    if (a.startsWith("--spell-id=")) spellId = Number(a.slice(11));
    if (a === "--dry-run") dryRun = true;
    if (a === "--apply") apply = true;
    if (a === "--only-missing") onlyMissing = true;
    if (a === "--flavor-force") flavorForce = true;
    if (a.startsWith("--delay-ms="))
      delayMs = Math.max(0, Number(a.slice(11)) || DELAY_DEFAULT_MS);
  }
  return {
    maxMounts,
    spellId,
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

  let list = mounts;
  if (args.spellId && Number.isFinite(args.spellId)) {
    list = mounts.filter((m) => m.id === args.spellId);
  }
  if (args.onlyMissing) {
    list = list.filter((m) => {
      const row = existingDigests[String(m.id)];
      return !digestRowHasContent(row);
    });
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
    "gpt-4o-mini";

  console.log(
    `[mount-flavor-batch] Processing ${list.length} mount(s)${args.dryRun ? " (dry-run)" : ""}`,
  );

  mkdirSync(outDir, { recursive: true });

  const digestAsOf = new Date().toISOString().slice(0, 10);
  const newRows = {};
  const errors = [];

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
      });
      newRows[String(sid)] = {
        asOf: digestAsOf,
        flavor,
        lines,
      };
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
      "OpenAI-generated flavor + acquisition copy from mounts.json metadata only; no Wowhead scraping.",
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
    const merged = { ...existingDigests };
    for (const [k, v] of Object.entries(newRows)) {
      merged[k] = { ...(merged[k] || {}), ...v };
    }
    writeFileSync(digestsPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`[mount-flavor-batch] Merged into ${digestsPath}`);
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
