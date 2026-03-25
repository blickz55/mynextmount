/**
 * Maintainer batch: LLM-generated mount-guides.json entries from mounts.json metadata.
 * NOT part of data:build. See docs/data-harvesting.md (Maintainer override).
 *
 * Default: writes data/build/mount-guides.batch.json (merge manually or use --apply).
 *
 * Usage:
 *   npm run content:guides-batch -- --limit=5 --only-missing
 *   npm run content:guides-batch -- --spell-id=40192 --dry-run
 *   npm run content:guides-batch -- --limit=50 --only-missing --apply
 *   (Also writes community-tip bullets → data/wowhead-comment-digests.json on --apply unless that spell already has digest lines; use --digest-force to overwrite.)
 *
 * Env (first match wins):
 *   CONTENT_GUIDES_OPENAI_API_KEY | FARM_TIP_OPENAI_API_KEY | OPENAI_API_KEY
 *   CONTENT_GUIDES_LLM_MODEL | FARM_TIP_LLM_MODEL (default gpt-4o-mini)
 *   CONTENT_GUIDES_OPENAI_BASE_URL | FARM_TIP_OPENAI_BASE_URL
 *   CONTENT_GUIDES_LLM_DELAY_MS (default 900)
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
import { applyWowheadItemIdToMountsList } from "./lib/wowhead-item-override.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data", "build");
const batchOutPath = join(outDir, "mount-guides-batch.json");
const guidesPath = join(root, "data", "mount-guides.json");
const digestsPath = join(root, "data", "wowhead-comment-digests.json");
const mountsPath = join(root, "data", "mounts.json");
const provenancePath = join(root, "data", "content-guides-provenance.json");

const MIN_CHECKLIST = 3;
const MAX_CHECKLIST = 6;
const MIN_COMMUNITY_TIPS = 3;
const MAX_COMMUNITY_TIPS = 5;
const MAX_COMMUNITY_TIP_CHARS = 220;
const DELAY_DEFAULT_MS = 900;

const SYSTEM = `You write short World of Warcraft Retail mount farming guides for a personal fansite.
Output EXACTLY one JSON object (no markdown fence) with keys:
- "overview": string, 2–4 sentences, original wording. You may mention once (briefly) that drop rules can change by patch; the source link below is the citation — do NOT turn that into checklist busywork.
- "checklist": array of 3–6 short strings, ordered steps, plain English, no HTML, no leading "• ".
- "sourceUrl": string, must be the https URL provided in the user message (use it exactly if valid).
- "sourceLabel": string, e.g. "Wowhead — Mount Name (spell)" or "Wowhead — item page".

Rules:
- Original prose only; do not copy long phrases from any training data that mirror third-party guides.
- If the mount is shop-only or trivial vendor, say so clearly in overview and shorten checklist.
- No insults; game advice only.

Checklist quality (critical — the product already shows a Wowhead source link):
- Every checklist line must be a concrete in-game or WoW client action (journal/collections UI, travel, difficulty, boss route, currency grind, PvP bracket, profession craft, etc.).
- Do NOT use any step that tells the user to open Wowhead, visit external sites, "confirm on the linked page", "verify on Wowhead", "check the website", or "look up the drop source" — that adds no value.
- Step 1 must not be a meta "research" step; start with something the player does in the client (e.g. open Mounts → select this mount → read the in-game Source line; or travel to the listed zone/instance if data gives one).
- Use fields from the Mount JSON: source, sourceCategory, boss, location, expansion, lockout, retailObtainable, difficulty, dropRate, timeToComplete. If location is vague (e.g. generic vendor text), still give faction-appropriate hub steps or journal-first steps — never "open Wowhead".
- If retailObtainable is false, write steps that reflect unobtainable / legacy status using the metadata (e.g. check journal grayed source, BMAH history) without sending them to an external browser as step 1.

Also output:
- "communityTips": array of ${MIN_COMMUNITY_TIPS}–${MAX_COMMUNITY_TIPS} strings for the site's "Mount spotlight" how-to bullets (same data slot as wowhead-comment-digests.json lines).
- Each tip is one concise bullet, max ${MAX_COMMUNITY_TIP_CHARS} characters, plain English, no HTML, no markdown list markers inside strings, no leading "• ".
- Write original wording in the *spirit* of typical forum / comment-thread discussion (lockouts, difficulty, camping competition, vendor quirks, BMAH, etc.) using ONLY the mount metadata provided — not quotes of real comments.
- Do not claim you read a specific thread; stay grounded in the JSON fields and cautious phrasing ("often", "check current patch in-game") where rules vary.
- Do not use a tip that only says to open Wowhead or read the linked page — those links already exist in the UI.`;

function parseArgs(argv) {
  /** Default cap per run (safety). --limit=0 means no cap (entire filtered list). */
  let maxMounts = 10;
  let offset = 0;
  let spellId = null;
  let dryRun = false;
  let apply = false;
  let onlyMissing = false;
  let force = false;
  let digestForce = false;
  let delayMs = DELAY_DEFAULT_MS;
  for (const a of argv) {
    if (a.startsWith("--limit=")) {
      const n = Number(a.slice(8));
      if (n === 0) maxMounts = Infinity;
      else if (Number.isFinite(n) && n > 0) maxMounts = n;
      else maxMounts = 10;
    }
    if (a.startsWith("--offset=")) offset = Math.max(0, Number(a.slice(9)) || 0);
    if (a.startsWith("--spell-id=")) spellId = Number(a.slice(11));
    if (a === "--dry-run") dryRun = true;
    if (a === "--apply") apply = true;
    if (a === "--only-missing") onlyMissing = true;
    if (a === "--force") force = true;
    if (a === "--digest-force") digestForce = true;
    if (a.startsWith("--delay-ms="))
      delayMs = Math.max(0, Number(a.slice(11)) || DELAY_DEFAULT_MS);
  }
  return {
    maxMounts,
    offset,
    spellId,
    dryRun,
    apply,
    onlyMissing,
    force,
    digestForce,
    delayMs,
  };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function guideCompleteInFile(guidesFile, id) {
  const g = guidesFile?.guides?.[String(id)];
  if (!g) return false;
  const ov = typeof g.overview === "string" && g.overview.trim();
  const cl = Array.isArray(g.checklist) && g.checklist.some((s) => String(s).trim());
  const su = typeof g.sourceUrl === "string" && g.sourceUrl.trim();
  return Boolean(ov && cl && su);
}

function defaultSourceUrl(mount) {
  if (
    typeof mount.wowheadItemId === "number" &&
    Number.isFinite(mount.wowheadItemId) &&
    mount.wowheadItemId > 0
  ) {
    return `https://www.wowhead.com/item=${mount.wowheadItemId}`;
  }
  const u = typeof mount.wowheadUrl === "string" ? mount.wowheadUrl.trim() : "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://www.wowhead.com/spell=${mount.id}`;
}

function defaultSourceLabel(mount) {
  const name = typeof mount.name === "string" ? mount.name : "Mount";
  if (
    typeof mount.wowheadItemId === "number" &&
    Number.isFinite(mount.wowheadItemId) &&
    mount.wowheadItemId > 0
  ) {
    return `Wowhead — ${name} (item)`;
  }
  return `Wowhead — ${name} (spell ${mount.id})`;
}

function mountPayload(mount) {
  return {
    id: mount.id,
    name: mount.name,
    source: mount.source,
    sourceCategory: mount.sourceCategory,
    boss: mount.boss,
    location: mount.location,
    expansion: mount.expansion,
    lockout: mount.lockout,
    retailObtainable: mount.retailObtainable,
    difficulty: mount.difficulty,
    dropRate: mount.dropRate,
    timeToComplete: mount.timeToComplete,
    asOfPatch: mount.asOfPatch,
    wowheadItemId: mount.wowheadItemId,
    wowheadUrl: mount.wowheadUrl,
    commentsUrl: mount.commentsUrl,
    tags: Array.isArray(mount.tags) ? mount.tags.slice(0, 12) : [],
  };
}

function buildUserPrompt(mount, sourceUrl, sourceLabelHint) {
  return [
    "Generate a farm guide JSON for this mount row from our static dataset.",
    "Use this exact sourceUrl in your output (unless broken — then use spell URL):",
    sourceUrl,
    "Suggested sourceLabel (you may refine slightly):",
    sourceLabelHint,
    "",
    "Mount JSON:",
    JSON.stringify(mountPayload(mount), null, 2),
    "",
    "Checklist: actionable in-game steps only — no 'open Wowhead' or 'verify on the linked page' lines (the UI already links Wowhead).",
    "",
    'Respond with JSON only: {"overview":"...","checklist":["..."],"sourceUrl":"...","sourceLabel":"...","communityTips":["...","..."]}',
  ].join("\n");
}

async function callOpenAI({ apiKey, baseUrl, model, user }) {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("No choices[0].message.content in response");
  }
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Could not find JSON in model output: ${trimmed.slice(0, 200)}`);
  }
  return JSON.parse(jsonMatch[0]);
}

function normalizeGuide(raw, mount, fallbackSourceUrl, fallbackLabel) {
  const overview =
    typeof raw.overview === "string" ? raw.overview.trim() : "";
  let checklist = Array.isArray(raw.checklist)
    ? raw.checklist.map((s) => String(s).trim()).filter(Boolean)
    : [];
  checklist = checklist.slice(0, MAX_CHECKLIST);
  let sourceUrl =
    typeof raw.sourceUrl === "string" ? raw.sourceUrl.trim() : "";
  if (!/^https?:\/\//i.test(sourceUrl)) {
    sourceUrl = fallbackSourceUrl;
  }
  let sourceLabel =
    typeof raw.sourceLabel === "string" ? raw.sourceLabel.trim() : "";
  if (!sourceLabel) sourceLabel = fallbackLabel;

  if (!overview || checklist.length < MIN_CHECKLIST) {
    throw new Error("Invalid overview or checklist length");
  }
  return { overview, checklist, sourceUrl, sourceLabel };
}

function digestRowComplete(row) {
  if (!row || typeof row !== "object") return false;
  const lines = row.lines;
  return Array.isArray(lines) && lines.some((s) => String(s).trim());
}

function normalizeCommunityTips(raw) {
  const arr = Array.isArray(raw.communityTips)
    ? raw.communityTips
    : Array.isArray(raw.lines)
      ? raw.lines
      : [];
  let tips = arr.map((s) => String(s).trim()).filter(Boolean).slice(0, MAX_COMMUNITY_TIPS);
  if (tips.length < MIN_COMMUNITY_TIPS) {
    throw new Error(
      `Invalid communityTips: need ${MIN_COMMUNITY_TIPS}-${MAX_COMMUNITY_TIPS} non-empty strings`,
    );
  }
  for (const t of tips) {
    if (t.length > MAX_COMMUNITY_TIP_CHARS) {
      throw new Error(
        `communityTips line too long (${t.length} chars; max ${MAX_COMMUNITY_TIP_CHARS})`,
      );
    }
  }
  return tips;
}

function normalizeBatchOutput(raw, mount, fallbackSourceUrl, fallbackLabel) {
  const guide = normalizeGuide(raw, mount, fallbackSourceUrl, fallbackLabel);
  const communityTips = normalizeCommunityTips(raw);
  return { guide, communityTips };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureProvenance() {
  if (existsSync(provenancePath)) return;
  writeFileSync(
    provenancePath,
    JSON.stringify({ schemaVersion: 1, batches: [] }, null, 2) + "\n",
    "utf8",
  );
}

function appendProvenance(entry) {
  ensureProvenance();
  const data = loadJson(provenancePath);
  data.batches = Array.isArray(data.batches) ? data.batches : [];
  data.batches.push(entry);
  writeFileSync(provenancePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function main() {
  loadProjectEnv(root);
  const args = parseArgs(process.argv.slice(2));

  let mounts = loadJson(mountsPath);
  if (!Array.isArray(mounts)) {
    console.error("[content-guides-batch] mounts.json must be an array.");
    process.exit(2);
  }
  mounts = applyWowheadItemIdToMountsList(mounts, root);

  const existingGuides = existsSync(guidesPath) ? loadJson(guidesPath) : { schemaVersion: 1, guides: {} };

  let list = mounts;
  if (args.spellId && Number.isFinite(args.spellId)) {
    list = mounts.filter((m) => m.id === args.spellId);
  } else {
    list = mounts.slice(args.offset);
  }

  if (args.onlyMissing) {
    list = list.filter((m) => !guideCompleteInFile(existingGuides, m.id));
  }

  if (Number.isFinite(args.maxMounts)) {
    list = list.slice(0, args.maxMounts);
  }

  if (list.length === 0) {
    console.log("[content-guides-batch] No mounts to process (check filters).");
    process.exit(0);
  }

  console.log(
    `[content-guides-batch] Processing ${list.length} mount(s)${args.dryRun ? " (dry-run)" : ""}`,
  );

  const apiKey =
    process.env.CONTENT_GUIDES_OPENAI_API_KEY ||
    process.env.FARM_TIP_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";
  const baseUrl =
    process.env.CONTENT_GUIDES_OPENAI_BASE_URL ||
    process.env.FARM_TIP_OPENAI_BASE_URL ||
    "https://api.openai.com/v1";
  const model =
    process.env.CONTENT_GUIDES_LLM_MODEL ||
    process.env.FARM_TIP_LLM_MODEL ||
    "gpt-4o-mini";

  mkdirSync(outDir, { recursive: true });

  const digestAsOf = new Date().toISOString().slice(0, 10);
  const newGuides = {};
  const newDigests = {};
  const errors = [];

  for (let i = 0; i < list.length; i++) {
    const mount = list[i];
    const sid = mount.id;
    const fallbackUrl = defaultSourceUrl(mount);
    const fallbackLabel = defaultSourceLabel(mount);
    const user = buildUserPrompt(mount, fallbackUrl, fallbackLabel);

    if (args.dryRun) {
      console.log(`  [dry-run] spell ${sid} ${mount.name || ""}`);
      continue;
    }

    if (!apiKey) {
      const envPath = join(root, ".env.local");
      console.error(
        "[content-guides-batch] No OpenAI API key found. Add one of these to .env.local (project root, no quotes):",
      );
      console.error(
        "  OPENAI_API_KEY=sk-...   OR   FARM_TIP_OPENAI_API_KEY=sk-...   OR   CONTENT_GUIDES_OPENAI_API_KEY=sk-...",
      );
      console.error(
        `  (Scripts load ${envPath} — ${existsSync(envPath) ? "file exists" : "file missing"}.)`,
      );
      process.exit(2);
    }

    if (!args.force && guideCompleteInFile(existingGuides, sid)) {
      console.log(`  skip ${sid} (already has guide; use --force to overwrite)`);
      continue;
    }

    try {
      const raw = await callOpenAI({ apiKey, baseUrl, model, user });
      const { guide, communityTips } = normalizeBatchOutput(
        raw,
        mount,
        fallbackUrl,
        fallbackLabel,
      );
      const key = String(sid);
      newGuides[key] = guide;
      newDigests[key] = { asOf: digestAsOf, lines: communityTips };
      console.log(`  ok ${sid} ${mount.name || ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ spellId: sid, error: msg });
      console.error(`  FAIL ${sid}: ${msg}`);
    }

    if (i < list.length - 1 && args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  }

  if (args.dryRun) {
    process.exit(0);
  }

  const batchDoc = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    model,
    guides: newGuides,
    commentDigests: newDigests,
  };
  writeFileSync(batchOutPath, JSON.stringify(batchDoc, null, 2) + "\n", "utf8");
  console.log(`[content-guides-batch] Wrote ${batchOutPath}`);

  appendProvenance({
    generatedAt: batchDoc.generatedAt,
    model,
    spellIds: Object.keys(newGuides).map(Number),
    errors,
    sourceNote:
      "content-guides-batch.mjs — LLM from mounts.json metadata (maintainer override); farm guide + communityTips → mount-guides.json + wowhead-comment-digests.json on apply",
    apply: args.apply,
  });

  if (args.apply && Object.keys(newGuides).length > 0) {
    const merged = {
      schemaVersion: existingGuides.schemaVersion ?? 1,
      guides: { ...existingGuides.guides, ...newGuides },
    };
    writeFileSync(guidesPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`[content-guides-batch] Merged into ${guidesPath} — run npm run addon:sync-guides`);

    if (Object.keys(newDigests).length > 0) {
      const existingDigests = existsSync(digestsPath) ? loadJson(digestsPath) : {};
      const mergedDigests = { ...existingDigests };
      let digestWrites = 0;
      for (const sid of Object.keys(newDigests)) {
        const prev = existingDigests[sid];
        if (args.digestForce || !digestRowComplete(prev)) {
          mergedDigests[sid] = newDigests[sid];
          digestWrites += 1;
        }
      }
      writeFileSync(digestsPath, JSON.stringify(mergedDigests, null, 2) + "\n", "utf8");
      console.log(
        `[content-guides-batch] Merged ${digestWrites} comment digest row(s) → ${digestsPath}${args.digestForce ? " (--digest-force)" : " (skipped spells that already had digest lines)"}`,
      );
    }
  } else if (Object.keys(newGuides).length > 0) {
    console.log(
      "  To merge: re-run with --apply (updates data/mount-guides.json and data/wowhead-comment-digests.json for spells without digest lines, or use --digest-force)",
    );
  }

  if (errors.length > 0) {
    console.log(`[content-guides-batch] ${errors.length} error(s); see provenance batch entry.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
