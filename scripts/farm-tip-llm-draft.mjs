/**
 * Epic C.4 — Optional LLM draft for data/farm-tips.json (NOT part of Phase B builds).
 *
 * Input: a text file with optional headers:
 *   # spellId: 12345
 *   # sourceNote: how excerpts were obtained (ToU-safe)
 *   <excerpt body — your lawful copy, not bulk-scraped>
 *
 * With API key: calls OpenAI Chat Completions → original short tip (JSON out).
 * Without: writes prompt to data/build/ for pasting into a browser LLM; exits 0.
 *
 * Usage:
 *   node scripts/farm-tip-llm-draft.mjs --file=fixtures/farm-tip-excerpt.example.txt
 *   node scripts/farm-tip-llm-draft.mjs --file=excerpts.txt --spell-id=63796
 *
 * Env (optional):
 *   FARM_TIP_OPENAI_API_KEY — if unset, template-only mode
 *   FARM_TIP_LLM_MODEL       — default gpt-4o-mini
 *   FARM_TIP_OPENAI_BASE_URL — default https://api.openai.com/v1
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { loadProjectEnv } from "./lib/project-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data", "build");
const promptPath = join(outDir, "farm-tip-llm-last-prompt.txt");
const outputPath = join(outDir, "farm-tip-llm-draft-output.json");

const SYSTEM = `You help write World of Warcraft mount "farm tips" for a personal fansite.
Rules:
- Output EXACTLY one JSON object with a single key "tip" (string).
- The tip must be 1–2 short sentences, plain English, under 280 characters.
- PARAPHRASE community facts; do NOT copy phrases verbatim from the excerpts.
- If excerpts conflict, prefer cautious wording ("check Wowhead for current rules").
- No HTML, no markdown, no quotes around the whole tip inside the JSON value.`;

function parseArgs(argv) {
  let file = "";
  let spellId = null;
  for (const a of argv) {
    if (a.startsWith("--file=")) file = a.slice(7);
    if (a.startsWith("--spell-id=")) spellId = Number(a.slice(11));
  }
  return { file, spellId };
}

function parseExcerptFile(raw) {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  let sid = null;
  let sourceNote = "";
  const bodyLines = [];
  for (const line of lines) {
    const m = line.match(/^#\s*spellId:\s*(\d+)\s*$/i);
    if (m) {
      sid = Number(m[1]);
      continue;
    }
    const n = line.match(/^#\s*sourceNote:\s*(.+)$/i);
    if (n) {
      sourceNote = n[1].trim();
      continue;
    }
    if (line.startsWith("#")) continue;
    bodyLines.push(line);
  }
  const body = bodyLines.join("\n").trim();
  return { spellId: sid, sourceNote, body };
}

function buildUserPrompt(spellId, sourceNote, body, mountNameHint) {
  return [
    `Summon spell ID: ${spellId}`,
    mountNameHint ? `Mount name (hint): ${mountNameHint}` : "",
    sourceNote ? `How excerpts were obtained: ${sourceNote}` : "",
    "",
    "Community / editor excerpts (may be incomplete or wrong):",
    body,
    "",
    'Respond with JSON only: {"tip":"..."}',
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
  const parsed = JSON.parse(jsonMatch[0]);
  if (typeof parsed.tip !== "string" || !parsed.tip.trim()) {
    throw new Error("JSON missing non-empty string .tip");
  }
  return parsed.tip.trim();
}

function loadMountName(rootDir, spellId) {
  try {
    const mounts = JSON.parse(
      readFileSync(join(rootDir, "data", "mounts.json"), "utf8"),
    );
    const row = mounts.find((m) => m.id === spellId);
    return row?.name || "";
  } catch {
    return "";
  }
}

async function main() {
  loadProjectEnv(root);
  const { file, spellId: spellIdArg } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error(
      "Usage: node scripts/farm-tip-llm-draft.mjs --file=path/to/excerpts.txt [--spell-id=123]",
    );
    process.exit(2);
  }

  const abs = join(root, file);
  const raw = readFileSync(abs, "utf8");
  const parsed = parseExcerptFile(raw);
  const spellId = spellIdArg ?? parsed.spellId;
  if (!spellId || !Number.isFinite(spellId)) {
    console.error(
      "Missing spell id: use # spellId: line in file or --spell-id=123",
    );
    process.exit(2);
  }
  if (!parsed.body) {
    console.error("Excerpt body is empty after headers.");
    process.exit(2);
  }

  const mountName = loadMountName(root, spellId);
  const userPrompt = buildUserPrompt(
    spellId,
    parsed.sourceNote,
    parsed.body,
    mountName,
  );

  mkdirSync(outDir, { recursive: true });
  const fullPrompt = `=== SYSTEM ===\n${SYSTEM}\n\n=== USER ===\n${userPrompt}\n`;
  writeFileSync(promptPath, fullPrompt, "utf8");

  const apiKey = process.env.FARM_TIP_OPENAI_API_KEY || "";
  const baseUrl = process.env.FARM_TIP_OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.FARM_TIP_LLM_MODEL || "gpt-4o-mini";

  const excerptHash = createHash("sha256").update(parsed.body).digest("hex").slice(0, 16);
  const generatedAt = new Date().toISOString();

  if (!apiKey) {
    console.log(
      "[farm-tip-llm-draft] No FARM_TIP_OPENAI_API_KEY — template-only mode.",
    );
    console.log(`  Wrote combined prompt → ${promptPath}`);
    console.log(
      "  Paste USER section into a browser LLM, then merge edited tip into data/farm-tips.json",
    );
    console.log(
      "  Record batch in data/farm-tip-provenance.json before merging the PR.",
    );
    writeFileSync(
      outputPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          mode: "template-only",
          spellId,
          generatedAt,
          excerptSha256Prefix: excerptHash,
          sourceNote: parsed.sourceNote || null,
          llmModel: null,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    process.exit(0);
  }

  console.log(`[farm-tip-llm-draft] Calling ${model}…`);
  const tip = await callOpenAI({ apiKey, baseUrl, model, user: userPrompt });
  const record = {
    schemaVersion: 1,
    mode: "openai",
    spellId,
    generatedAt,
    draftTip: tip,
    excerptSha256Prefix: excerptHash,
    sourceNote: parsed.sourceNote || null,
    llmModel: model,
    disclaimer:
      "Human must edit and approve before committing to data/farm-tips.json.",
  };
  writeFileSync(outputPath, JSON.stringify(record, null, 2) + "\n", "utf8");
  console.log(`[farm-tip-llm-draft] Draft tip (${tip.length} chars):`);
  console.log(tip);
  console.log(`\n  Full record → ${outputPath}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[farm-tip-llm-draft] ERROR", e.message || e);
  process.exit(2);
});
