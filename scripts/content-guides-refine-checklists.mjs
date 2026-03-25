/**
 * Rewrite existing mount guide checklists to remove low-value "open Wowhead" filler.
 * Uses the same mount row JSON as content-guides-batch; only replaces checklist[].
 *
 * Usage:
 *   npm run content:guides-refine-checklists -- --only-filler --limit=20 --dry-run
 *   npm run content:guides-refine-checklists -- --only-filler --limit=0 --apply
 *   npm run content:guides-refine-checklists -- --spell-id=40192 --apply
 *
 * Env: same OpenAI keys as content:guides-batch (OPENAI_API_KEY, CONTENT_GUIDES_*, FARM_TIP_*).
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
const batchOutPath = join(outDir, "mount-guides-refine-checklists-batch.json");
const guidesPath = join(root, "data", "mount-guides.json");
const mountsPath = join(root, "data", "mounts.json");
const provenancePath = join(root, "data", "content-guides-provenance.json");

const MIN_CHECKLIST = 3;
const MAX_CHECKLIST = 6;
const DELAY_DEFAULT_MS = 900;

const REFINE_SYSTEM = `You rewrite ONLY the checklist for a World of Warcraft Retail mount farm guide.
Output EXACTLY one JSON object (no markdown fence): {"checklist":["step1","step2",...]} with ${MIN_CHECKLIST}–${MAX_CHECKLIST} strings.

Rules:
- Each string is a concrete in-game or WoW client action (Mounts / Collections journal, travel, map pin, raid difficulty, boss order, currency farm, PvP bracket, vendor browsing, etc.).
- FORBIDDEN: any step that tells the user to open Wowhead, visit external websites, "confirm on the linked page", "verify on Wowhead", "check the website", or generic "look up the drop source". The product UI already shows a Wowhead source link — repeating that in the checklist is useless.
- Step 1 must be an action in the client or world, not "research online".
- Use the Mount JSON fields: source, sourceCategory, boss, location, expansion, lockout, retailObtainable, difficulty, dropRate, timeToComplete. If location is vague, use journal-first steps (open Mounts → this mount → read Source) and sensible faction/hub patterns — still no browser steps.
- If retailObtainable is false, reflect legacy / unobtainable reality in-game (journal grayed source, achievement history, BMAH) without "go to Wowhead" as the first step.
- No HTML, no markdown list markers inside strings, no leading "• ". Keep each step under 200 characters.`;

function parseArgs(argv) {
  let maxMounts = 10;
  let offset = 0;
  let spellId = null;
  let dryRun = false;
  let apply = false;
  let onlyFiller = false;
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
    if (a === "--only-filler") onlyFiller = true;
    if (a.startsWith("--delay-ms="))
      delayMs = Math.max(0, Number(a.slice(11)) || DELAY_DEFAULT_MS);
  }
  return { maxMounts, offset, spellId, dryRun, apply, onlyFiller, delayMs };
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stepLooksLikeWowheadFiller(s) {
  const t = String(s).toLowerCase();
  if (/wowhead|wow head/.test(t)) return true;
  if (
    /\b(open|visit|go to|check)\b.*\b(linked\s+)?(page|site|website|url)\b/.test(
      t,
    )
  )
    return true;
  if (/\bverify\b.*\b(linked\s+)?(page|online|website)\b/.test(t)) return true;
  if (/\bconfirm\b.*\b(on\s+)?(the\s+)?(linked\s+)?(wowhead|page)\b/.test(t))
    return true;
  if (/\bconfirm\s+the\s+exact\s+drop\s+source\b/.test(t)) return true;
  if (/\bread\s+the\s+wowhead\b/.test(t)) return true;
  return false;
}

function guideHasFillerChecklist(guide) {
  const cl = guide?.checklist;
  if (!Array.isArray(cl)) return false;
  return cl.some((s) => stepLooksLikeWowheadFiller(String(s)));
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
    tags: Array.isArray(mount.tags) ? mount.tags.slice(0, 12) : [],
  };
}

function buildRefineUserPrompt(mount, currentChecklist) {
  return [
    "Rewrite the checklist using this Mount JSON and the current checklist as context (do not copy filler wording).",
    "",
    "Mount JSON:",
    JSON.stringify(mountPayload(mount), null, 2),
    "",
    "Current checklist:",
    JSON.stringify(currentChecklist, null, 2),
    "",
    'Respond with JSON only: {"checklist":["..."]}',
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
      temperature: 0.35,
      messages: [
        { role: "system", content: REFINE_SYSTEM },
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

function normalizeChecklist(raw) {
  let checklist = Array.isArray(raw.checklist)
    ? raw.checklist.map((s) => String(s).trim()).filter(Boolean)
    : [];
  checklist = checklist.slice(0, MAX_CHECKLIST);
  if (checklist.length < MIN_CHECKLIST) {
    throw new Error(`Need ${MIN_CHECKLIST}-${MAX_CHECKLIST} checklist strings`);
  }
  for (const s of checklist) {
    if (stepLooksLikeWowheadFiller(s)) {
      throw new Error(`Refused checklist still contains filler: ${s.slice(0, 80)}`);
    }
  }
  return checklist;
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

  const guidesFile = loadJson(guidesPath);
  let mounts = loadJson(mountsPath);
  if (!Array.isArray(mounts)) {
    console.error("[guides-refine-checklists] mounts.json must be an array.");
    process.exit(2);
  }
  mounts = applyWowheadItemIdToMountsList(mounts, root);
  const mountById = new Map(mounts.map((m) => [m.id, m]));

  const guides = guidesFile.guides || {};
  let ids = Object.keys(guides)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (args.spellId && Number.isFinite(args.spellId)) {
    ids = ids.filter((id) => id === args.spellId);
  }

  ids = ids.slice(args.offset);

  if (args.onlyFiller) {
    ids = ids.filter((id) => guideHasFillerChecklist(guides[String(id)]));
  }

  if (Number.isFinite(args.maxMounts)) {
    ids = ids.slice(0, args.maxMounts);
  }

  if (ids.length === 0) {
    console.log("[guides-refine-checklists] No guides to process.");
    process.exit(0);
  }

  console.log(
    `[guides-refine-checklists] Processing ${ids.length} guide(s)${args.dryRun ? " (dry-run)" : ""}`,
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

  if (!args.dryRun && !apiKey) {
    console.error("[guides-refine-checklists] Set OPENAI_API_KEY (or CONTENT_GUIDES_OPENAI_API_KEY).");
    process.exit(2);
  }

  mkdirSync(outDir, { recursive: true });

  const updated = {};
  const errors = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const key = String(id);
    const g = guides[key];
    const mount = mountById.get(id);

    if (!g || !Array.isArray(g.checklist)) {
      console.log(`  skip ${id} (no guide)`);
      continue;
    }
    if (!mount) {
      errors.push({ spellId: id, error: "mount row missing in mounts.json" });
      console.error(`  FAIL ${id}: no mount row`);
      continue;
    }

    if (args.dryRun) {
      console.log(`  [dry-run] ${id} ${mount.name || ""}`);
      continue;
    }

    try {
      const user = buildRefineUserPrompt(mount, g.checklist);
      const raw = await callOpenAI({ apiKey, baseUrl, model, user });
      const checklist = normalizeChecklist(raw);
      updated[key] = { ...g, checklist };
      console.log(`  ok ${id} ${mount.name || ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ spellId: id, error: msg });
      console.error(`  FAIL ${id}: ${msg}`);
    }

    if (i < ids.length - 1 && args.delayMs > 0) await sleep(args.delayMs);
  }

  if (args.dryRun) {
    process.exit(0);
  }

  writeFileSync(
    batchOutPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        model,
        mode: "refine-checklists-only",
        updatedSpellIds: Object.keys(updated).map(Number),
        guides: updated,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`[guides-refine-checklists] Wrote ${batchOutPath}`);

  appendProvenance({
    generatedAt: new Date().toISOString(),
    model,
    spellIds: Object.keys(updated).map(Number),
    errors,
    sourceNote:
      "content-guides-refine-checklists.mjs — checklist-only rewrite (remove Wowhead filler steps)",
    apply: args.apply,
  });

  if (args.apply && Object.keys(updated).length > 0) {
    const mergedGuides = { ...guides };
    for (const k of Object.keys(updated)) {
      mergedGuides[k] = updated[k];
    }
    const merged = {
      schemaVersion: guidesFile.schemaVersion ?? 1,
      guides: mergedGuides,
    };
    writeFileSync(guidesPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`[guides-refine-checklists] Merged into ${guidesPath} — run npm run addon:sync-guides`);
  } else if (Object.keys(updated).length > 0) {
    console.log("  Merge with: same command plus --apply");
  }

  if (errors.length > 0) {
    console.log(`[guides-refine-checklists] ${errors.length} error(s); see provenance.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
