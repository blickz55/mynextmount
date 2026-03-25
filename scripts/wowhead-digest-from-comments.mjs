/**
 * Fetch Wowhead comment JSON (top bodies), paraphrase via OpenAI → data/wowhead-comment-digests.json.
 * Operator is responsible for permission / ToS with Wowhead; see docs/wowhead-digests.md.
 *
 * Usage:
 *   npm run content:wowhead-digests-from-web -- --spell-id=40192 --dry-run
 *   npm run content:wowhead-digests-from-web -- --limit=5 --only-missing --apply
 *
 * If CloudFront returns 403, run from a normal browser network (residential IP) and/or set WOWHEAD_COOKIE.
 * Capture the real JSON URL from DevTools → Network and set WOWHEAD_COMMENTS_URL_TEMPLATE (see .env.example).
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
import { fetchWowheadCommentTexts, resolveWowheadCommentTarget } from "./lib/wowhead-comments-fetch.mjs";
import {
  MAX_COMMENTS_IN,
  buildDigestUserPrompt,
  callOpenAIForDigestLines,
} from "./lib/wowhead-digest-llm.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data", "build");
const batchOutPath = join(outDir, "wowhead-digest-from-web-batch.json");
const mountsPath = join(root, "data", "mounts.json");
const digestsPath = join(root, "data", "wowhead-comment-digests.json");
const provenancePath = join(root, "data", "wowhead-digest-provenance.json");

const LLM_DELAY_DEFAULT_MS = 900;

function parseArgs(argv) {
  let maxMounts = 10;
  let spellId = null;
  let dryRun = false;
  let apply = false;
  let onlyMissing = false;
  let digestForce = false;
  let delayMs = LLM_DELAY_DEFAULT_MS;
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
    if (a === "--digest-force") digestForce = true;
    if (a.startsWith("--delay-ms="))
      delayMs = Math.max(0, Number(a.slice(11)) || LLM_DELAY_DEFAULT_MS);
  }
  return { maxMounts, spellId, dryRun, apply, onlyMissing, digestForce, delayMs };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function digestRowComplete(row) {
  if (!row || typeof row !== "object") return false;
  const lines = row.lines;
  return Array.isArray(lines) && lines.some((s) => String(s).trim());
}

function loadMountName(mounts, spellId) {
  const row = mounts.find((m) => m.id === spellId);
  return typeof row?.name === "string" ? row.name : "";
}

function urlTemplatesFromEnv(env) {
  const single = (env.WOWHEAD_COMMENTS_URL_TEMPLATE || "").trim();
  const multi = (env.WOWHEAD_COMMENTS_URL_TEMPLATES || "").trim();
  if (multi) {
    return multi
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (single) return [single];
  return undefined;
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

  const mounts = loadJson(mountsPath);
  if (!Array.isArray(mounts)) {
    console.error("[wowhead-digest-from-web] mounts.json must be an array.");
    process.exit(2);
  }

  const existingDigests = existsSync(digestsPath) ? loadJson(digestsPath) : {};

  let list = mounts;
  if (args.spellId && Number.isFinite(args.spellId)) {
    list = mounts.filter((m) => m.id === args.spellId);
  }
  if (args.onlyMissing) {
    list = list.filter((m) => !digestRowComplete(existingDigests[String(m.id)]));
  }
  if (Number.isFinite(args.maxMounts)) {
    list = list.slice(0, args.maxMounts);
  }

  if (list.length === 0) {
    console.log("[wowhead-digest-from-web] No mounts to process.");
    process.exit(0);
  }

  const userAgent =
    env.WOWHEAD_FETCH_USER_AGENT?.trim() ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MyNextMountDigestBot/1.0";
  const cookie = env.WOWHEAD_COOKIE || "";
  const templates = urlTemplatesFromEnv(env);

  const sourceNote =
    env.WOWHEAD_DIGEST_FETCH_SOURCE_NOTE?.trim() ||
    "HTTP JSON fetch of Wowhead comment thread for mount page (objectType/objectId from wowheadUrl); maintainer asserts rights to automate; OpenAI paraphrase for site display only.";

  const apiKey =
    env.WOWHEAD_DIGEST_OPENAI_API_KEY ||
    env.FARM_TIP_OPENAI_API_KEY ||
    env.OPENAI_API_KEY ||
    "";
  const baseUrl =
    env.WOWHEAD_DIGEST_OPENAI_BASE_URL ||
    env.FARM_TIP_OPENAI_BASE_URL ||
    "https://api.openai.com/v1";
  const model =
    env.WOWHEAD_DIGEST_LLM_MODEL ||
    env.FARM_TIP_LLM_MODEL ||
    env.CONTENT_GUIDES_LLM_MODEL ||
    "gpt-4o-mini";

  console.log(
    `[wowhead-digest-from-web] Processing ${list.length} mount(s)${args.dryRun ? " (dry-run)" : ""}`,
  );

  mkdirSync(outDir, { recursive: true });

  const digestAsOf = new Date().toISOString().slice(0, 10);
  const newRows = {};
  const metaBySpell = {};
  const errors = [];

  for (let i = 0; i < list.length; i++) {
    const mount = list[i];
    const sid = mount.id;
    const name = loadMountName(mounts, sid);

    if (
      !args.digestForce &&
      digestRowComplete(existingDigests[String(sid)])
    ) {
      console.log(`  skip ${sid} (digest already present; use --digest-force)`);
      continue;
    }

    const target = resolveWowheadCommentTarget(mount, env);
    if (args.dryRun) {
      console.log(
        `  [dry-run] ${sid} ${name} → fetch type=${target.objectType} id=${target.objectId} (${target.pageKind})`,
      );
      continue;
    }

    if (!apiKey) {
      console.error(
        "[wowhead-digest-from-web] Set OPENAI_API_KEY or WOWHEAD_DIGEST_OPENAI_API_KEY in .env.local",
      );
      process.exit(2);
    }

    let texts;
    let fetchUrl;
    try {
      const r = await fetchWowheadCommentTexts({
        objectType: target.objectType,
        objectId: target.objectId,
        userAgent,
        cookie: cookie || undefined,
        maxComments: MAX_COMMENTS_IN,
        urlTemplates: templates,
      });
      texts = r.texts;
      fetchUrl = r.urlUsed;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ spellId: sid, phase: "fetch", error: msg });
      console.error(`  FAIL fetch ${sid}: ${msg.split("\n")[0]}`);
      if (i < list.length - 1 && args.delayMs > 0) await sleep(args.delayMs);
      continue;
    }

    try {
      const user = buildDigestUserPrompt(sid, name, sourceNote, texts);
      const lines = await callOpenAIForDigestLines({
        apiKey,
        baseUrl,
        model,
        user,
      });
      if (lines.length < 1) {
        throw new Error("LLM returned no lines");
      }
      newRows[String(sid)] = { asOf: digestAsOf, lines };
      metaBySpell[String(sid)] = { fetchUrl, excerptCount: texts.length };
      console.log(`  ok ${sid} ${name} (${texts.length} excerpts → ${lines.length} lines)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ spellId: sid, phase: "llm", error: msg });
      console.error(`  FAIL llm ${sid}: ${msg}`);
    }

    if (i < list.length - 1 && args.delayMs > 0) await sleep(args.delayMs);
  }

  if (args.dryRun) {
    process.exit(0);
  }

  const batchDoc = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model,
    sourceNote,
    digests: newRows,
    fetchMeta: metaBySpell,
  };
  writeFileSync(batchOutPath, JSON.stringify(batchDoc, null, 2) + "\n", "utf8");
  console.log(`[wowhead-digest-from-web] Wrote ${batchOutPath}`);

  appendProvenance({
    generatedAt: batchDoc.generatedAt,
    model,
    spellIds: Object.keys(newRows).map(Number),
    errors,
    sourceNote,
    apply: args.apply,
  });

  if (args.apply && Object.keys(newRows).length > 0) {
    const merged = { ...existingDigests, ...newRows };
    writeFileSync(digestsPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`[wowhead-digest-from-web] Merged into ${digestsPath}`);
  } else if (Object.keys(newRows).length > 0) {
    console.log("  Merge with: same command plus --apply");
  }

  if (errors.length > 0) {
    console.log(`[wowhead-digest-from-web] ${errors.length} error(s); see ${provenancePath}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
