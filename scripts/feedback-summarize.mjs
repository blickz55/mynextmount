/**
 * Regenerate the "AI digest" in feedback.md from the "Raw log" section.
 *
 * Env (any one):
 *   OPENAI_API_KEY | FARM_TIP_OPENAI_API_KEY | CONTENT_GUIDES_OPENAI_API_KEY
 * Optional: FEEDBACK_LLM_MODEL (default gpt-4o-mini)
 *           FEEDBACK_OPENAI_BASE_URL (default https://api.openai.com/v1)
 *
 * Usage:
 *   node scripts/feedback-summarize.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const feedbackPath = join(root, "feedback.md");

const SYSTEM = `You maintain an internal product feedback digest for "MyNextMount", a WoW mount-farming assistant (website + addon, export string like Raidbots).

Output rules:
- Write valid Markdown only (no outer code fence).
- Use ### headings for: Overview, Product / positioning, UX & copy ideas, Feature / backlog hints, Risks or sensitivities (if any), Suggested next steps.
- Be concise and actionable; bullet lists where helpful.
- Attribute ideas to "Tester" when they are opinions or jokes from chat, not facts.
- Do NOT invent metrics or user demographics; if someone claims "90% women" treat it as unsupported tester humor unless framed as hypothesis.
- Note anything that could read as exclusionary or creepy (e.g. gender-based routing) and flag for product judgment.
- Keep tone professional; preserve funny tagline ideas as a short quoted list if useful.`;

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
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("No choices[0].message.content in response");
  }
  return content.trim();
}

function pickApiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.FARM_TIP_OPENAI_API_KEY ||
    process.env.CONTENT_GUIDES_OPENAI_API_KEY ||
    ""
  ).trim();
}

function extractRawLog(md) {
  const idx = md.search(/^## Raw log/m);
  if (idx === -1) {
    throw new Error('feedback.md must contain a "## Raw log" section');
  }
  return md.slice(idx).trim();
}

function replaceDigest(md, newBody, generatedAt) {
  const start = "<!-- AI_DIGEST_START -->";
  const end = "<!-- AI_DIGEST_END -->";
  const si = md.indexOf(start);
  const ei = md.indexOf(end);
  if (si === -1 || ei === -1 || ei <= si) {
    throw new Error("Missing AI_DIGEST markers in feedback.md");
  }
  const header = `_Last regenerated (UTC): ${generatedAt}_\n\n`;
  const inner = `${start}\n${header}${newBody.trim()}\n${end}`;
  return md.slice(0, si) + inner + md.slice(ei + end.length);
}

async function main() {
  loadProjectEnv(root);
  const apiKey = pickApiKey();
  if (!apiKey) {
    console.error(
      "[feedback-summarize] Set OPENAI_API_KEY or FARM_TIP_OPENAI_API_KEY (or CONTENT_GUIDES_OPENAI_API_KEY) in .env.local",
    );
    process.exit(2);
  }

  const baseUrl =
    process.env.FEEDBACK_OPENAI_BASE_URL ||
    process.env.FARM_TIP_OPENAI_BASE_URL ||
    "https://api.openai.com/v1";
  const model = process.env.FEEDBACK_LLM_MODEL || "gpt-4o-mini";

  const md = readFileSync(feedbackPath, "utf8");
  const rawLog = extractRawLog(md);

  const userPrompt = `Below is the append-only raw feedback log from chats / testers. Summarize it for the founder per your system rules.\n\n---\n\n${rawLog}`;

  console.log(`[feedback-summarize] Calling ${model}…`);
  const digest = await callOpenAI({ apiKey, baseUrl, model, user: userPrompt });
  const generatedAt = new Date().toISOString();
  const out = replaceDigest(md, digest, generatedAt);
  writeFileSync(feedbackPath, out, "utf8");
  console.log(`[feedback-summarize] Updated ${feedbackPath}`);
}

main().catch((e) => {
  console.error("[feedback-summarize] ERROR", e.message || e);
  process.exit(2);
});
