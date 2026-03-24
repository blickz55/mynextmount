/**
 * Epic D.5 — LLM draft for data/wowhead-comment-digests.json (NOT part of data:build).
 *
 * Input: JSON with top Wowhead comment *excerpts* you lawfully obtained (manual copy from
 * the browser, export you have rights to use, etc.) — see docs/wowhead-digests.md.
 *
 * With API key: calls OpenAI Chat Completions → original paraphrased bullets (JSON out).
 * Without: writes prompts to data/build/ for pasting into a browser LLM.
 *
 * Usage:
 *   npm run wowhead-digest:draft -- --file=fixtures/wowhead-top-comments.example.json
 *   npm run wowhead-digest:draft -- --file=data/build/my-comments-batch.json --max=3
 *   npm run wowhead-digest:draft -- --file=batch.json --spell-id=40192
 *
 * Env (optional; same as farm-tip script for one key to rule them all):
 *   FARM_TIP_OPENAI_API_KEY — preferred
 *   WOWHEAD_DIGEST_OPENAI_API_KEY — overrides farm tip key for this script only
 *   WOWHEAD_DIGEST_LLM_MODEL — default gpt-4o-mini
 *   WOWHEAD_DIGEST_OPENAI_BASE_URL — default https://api.openai.com/v1
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { loadProjectEnv } from "./lib/project-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data", "build");
const promptsPath = join(outDir, "wowhead-digest-llm-prompts.txt");
const outputPath = join(outDir, "wowhead-digest-llm-draft-output.json");

const MAX_COMMENTS_IN = 5;
const MAX_LINES_OUT = 5;
const LLM_DELAY_MS_DEFAULT = 750;

const SYSTEM = `You summarize World of Warcraft mount farming discussion for a personal fansite.
Rules:
- Output EXACTLY one JSON object with a single key "lines" (array of strings).
- Emit between 3 and ${MAX_LINES_OUT} strings (fewer only if excerpts are empty or useless).
- Each string is one concise bullet under 220 characters, plain English, for players farming the mount.
- PARAPHRASE only: do NOT copy sentences or distinctive phrases from the excerpts.
- Prefer actionable tips (source, lockout, difficulty, routes) when supported; mark uncertainty ("often", "check current patch") when excerpts conflict.
- No HTML, no markdown list markers inside strings, no leading "• ".
- No insults, no real-world personal data; game advice only.`;

function parseArgs(argv) {
  let file = "";
  let spellId = null;
  let max = Infinity;
  for (const a of argv) {
    if (a.startsWith("--file=")) file = a.slice(7);
    if (a.startsWith("--spell-id=")) spellId = Number(a.slice(11));
    if (a.startsWith("--max=")) max = Math.max(1, Number(a.slice(6)) || 1);
  }
  return { file, spellId, max };
}

function loadMountName(spellId) {
  try {
    const mounts = JSON.parse(
      readFileSync(join(root, "data", "mounts.json"), "utf8"),
    );
    const row = mounts.find((m) => m.id === spellId);
    return typeof row?.name === "string" ? row.name : "";
  } catch {
    return "";
  }
}

function normalizeInput(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (data?.schemaVersion !== 1) {
    throw new Error('Input JSON must have "schemaVersion": 1');
  }
  const sourceNote = typeof data.sourceNote === "string" ? data.sourceNote.trim() : "";
  if (!sourceNote) {
    throw new Error('Input JSON must include non-empty "sourceNote" (audit trail)');
  }
  const entries = [];
  if (Array.isArray(data.entries)) {
    for (const e of data.entries) {
      const sid = Number(e?.spellId);
      if (!Number.isFinite(sid)) continue;
      const comments = Array.isArray(e?.comments) ? e.comments : [];
      const texts = comments
        .map((c) => (typeof c?.text === "string" ? c.text.trim() : ""))
        .filter(Boolean)
        .slice(0, MAX_COMMENTS_IN);
      entries.push({ spellId: sid, comments: texts });
    }
  }
  return { sourceNote, entries };
}

function buildUserPrompt(spellId, mountName, sourceNote, commentTexts) {
  const blocks = commentTexts
    .map((t, i) => `--- Excerpt ${i + 1} ---\n${t}`)
    .join("\n\n");
  return [
    `Summon spell ID: ${spellId}`,
    mountName ? `Mount name (from site dataset): ${mountName}` : "",
    `How excerpts were obtained: ${sourceNote}`,
    "",
    `Up to ${MAX_COMMENTS_IN} community comment excerpts (paraphrase targets; do not quote verbatim):`,
    blocks || "(no excerpt text — output 0–2 cautious generic lines suggesting the user check Wowhead for current tips.)",
    "",
    `Respond with JSON only: {"lines":["bullet one","bullet two",...]} (max ${MAX_LINES_OUT} bullets).`,
  ]
    .filter(Boolean)
    .join("\n");
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
  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.lines)) {
    throw new Error('JSON missing array "lines"');
  }
  const lines = parsed.lines
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, MAX_LINES_OUT);
  return lines;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  loadProjectEnv(root);
  const { file, spellId: filterSpellId, max } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error(
      "Usage: node scripts/wowhead-digest-llm-draft.mjs --file=path/to/comments-batch.json [--spell-id=N] [--max=N]",
    );
    process.exit(2);
  }

  const abs = join(root, file);
  const raw = readFileSync(abs, "utf8");
  const { sourceNote, entries: allEntries } = normalizeInput(raw);
  let entries = allEntries;
  if (filterSpellId && Number.isFinite(filterSpellId)) {
    entries = entries.filter((e) => e.spellId === filterSpellId);
  }
  entries = entries.slice(0, max);
  if (entries.length === 0) {
    console.error("No entries to process (check spell ids and --spell-id filter).");
    process.exit(2);
  }

  const apiKey =
    process.env.WOWHEAD_DIGEST_OPENAI_API_KEY ||
    process.env.FARM_TIP_OPENAI_API_KEY ||
    "";
  const baseUrl =
    process.env.WOWHEAD_DIGEST_OPENAI_BASE_URL ||
    process.env.FARM_TIP_OPENAI_BASE_URL ||
    "https://api.openai.com/v1";
  const model =
    process.env.WOWHEAD_DIGEST_LLM_MODEL ||
    process.env.FARM_TIP_LLM_MODEL ||
    "gpt-4o-mini";

  mkdirSync(outDir, { recursive: true });

  const inputHash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  const generatedAt = new Date().toISOString();

  const promptSections = [];
  for (const e of entries) {
    const mountName = loadMountName(e.spellId);
    const user = buildUserPrompt(e.spellId, mountName, sourceNote, e.comments);
    promptSections.push(
      `\n\n########## SPELL ${e.spellId} (${mountName || "unknown name"}) ##########\n=== SYSTEM ===\n${SYSTEM}\n\n=== USER ===\n${user}\n`,
    );
  }
  writeFileSync(promptsPath, promptSections.join(""), "utf8");

  if (!apiKey) {
    console.log(
      "[wowhead-digest-llm-draft] No WOWHEAD_DIGEST_OPENAI_API_KEY or FARM_TIP_OPENAI_API_KEY — template-only mode.",
    );
    console.log(`  Wrote ${promptsPath}`);
    console.log(
      "  Paste each USER block into a browser LLM, then merge reviewed lines into data/wowhead-comment-digests.json",
    );
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          mode: "template-only",
          generatedAt,
          sourceNote,
          inputFile: file,
          inputSha256Prefix: inputHash,
          spellIds: entries.map((e) => e.spellId),
          llmModel: null,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    process.exit(0);
  }

  const drafts = {};
  const delayMs = Number(process.env.WOWHEAD_DIGEST_LLM_DELAY_MS || LLM_DELAY_MS_DEFAULT);
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const mountName = loadMountName(e.spellId);
    const user = buildUserPrompt(e.spellId, mountName, sourceNote, e.comments);
    console.log(`[wowhead-digest-llm-draft] ${i + 1}/${entries.length} spell ${e.spellId} (${model})…`);
    const lines = await callOpenAI({ apiKey, baseUrl, model, user });
    drafts[String(e.spellId)] = { lines, mountName: mountName || null };
    if (i < entries.length - 1) await sleep(delayMs);
  }

  const mergeSnippet = {};
  const today = generatedAt.slice(0, 10);
  for (const [k, v] of Object.entries(drafts)) {
    if (v.lines?.length) {
      mergeSnippet[k] = { asOf: today, lines: v.lines };
    }
  }

  const record = {
    schemaVersion: 1,
    mode: "openai",
    generatedAt,
    sourceNote,
    inputFile: file,
    inputSha256Prefix: inputHash,
    llmModel: model,
    drafts,
    suggestedMergeIntoWowheadCommentDigests: mergeSnippet,
    disclaimer:
      "Review each line for accuracy and ToU-safe paraphrase; then merge into data/wowhead-comment-digests.json and bump asOf if needed.",
  };
  writeFileSync(outputPath, JSON.stringify(record, null, 2) + "\n", "utf8");
  console.log(`\n[wowhead-digest-llm-draft] Wrote ${outputPath}`);
  console.log(
    "Suggested JSON keys for wowhead-comment-digests.json (copy after review):",
  );
  console.log(JSON.stringify(mergeSnippet, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error("[wowhead-digest-llm-draft] ERROR", e.message || e);
  process.exit(2);
});
