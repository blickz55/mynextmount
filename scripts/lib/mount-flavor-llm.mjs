/**
 * OpenAI JSON output: micro acquisition bullets only (no flavor paragraph).
 * Prefers Responses API for gpt-5.*; chat/completions for older models.
 */

export const MAX_MICRO_LINES = 5;
export const MAX_WORDS_PER_LINE = 10;

export const MOUNT_FLAVOR_SYSTEM = `You write ultra-short World of Warcraft Retail mount acquisition steps for a fansite.

Output EXACTLY one JSON object (no markdown code fence) with a single key:
- "lines": array of 1–${MAX_MICRO_LINES} strings.

Do not output a "flavor" paragraph or any other keys.

Each string is one bullet:
- At most ${MAX_WORDS_PER_LINE} words (count words as tokens separated by whitespace).
- Plain English; no leading "•", "-", or step numbers.
- Dense, imperative style: where to go, difficulty/mode toggles, boss or vendor, loot/currency, lockout and RNG in separate bullets when needed.
- No filler: no "check Wowhead", "open the linked page", "nostalgic", "collectors cherish", "majestic", emojis, or journal busywork unless the ONLY actionable step is reading the in-game mount journal Source line (still keep it under the word cap).
- Never put URLs or links in bullets (no wowhead.com, no http/https). The site already links the correct Wowhead page (item when mapped).

Accuracy (critical):
- Obey sourceCategory, boss, location, lockout, expansion, tags, and retailObtainable from the user payload when they are specific.
- If a heuristic field (e.g. lockout or dropRate) conflicts with well-known current Retail rules for this exact mount, prefer Retail reality and mention the right cadence.
- When location/boss fields are vague placeholders but the mount name uniquely identifies a famous mount, use accurate current Retail acquisition knowledge (correct instance, boss, vendor, or achievement). Never invent the wrong boss or zone.
- Rough drop odds only if helpful ("~1%", "~low chance"); never fake exact percentages.
- If retailObtainable is false, state unobtainable / legacy / BMAH-style reality in bullets; do not imply an easy farm still exists.

Do not claim you read Wowhead or scraped comments.`;

/**
 * @param {object} mount — one row from mounts.json (with optional wowheadItemId merged)
 */
export function buildMountFlavorUserPrompt(mount) {
  const itemId =
    typeof mount.wowheadItemId === "number" &&
    Number.isFinite(mount.wowheadItemId) &&
    mount.wowheadItemId > 0
      ? mount.wowheadItemId
      : null;
  const refUrl = itemId
    ? `https://www.wowhead.com/item=${itemId} (reference only — you did not visit it)`
    : mount.wowheadUrl?.trim() ||
      `(no item id mapped; spell page would be https://www.wowhead.com/spell=${mount.id})`;

  return [
    `Summon spell id: ${mount.id}`,
    `Name: ${mount.name}`,
    `Source field: ${mount.source}`,
    mount.boss ? `Boss: ${mount.boss}` : "",
    `Location: ${mount.location}`,
    `Expansion: ${mount.expansion}`,
    `Lockout: ${mount.lockout}`,
    `Difficulty (1–5 scale in data): ${mount.difficulty}`,
    `Drop rate hint (0–1 scale in data): ${mount.dropRate}`,
    `Time-to-complete hint (minutes, heuristic): ${mount.timeToComplete}`,
    `Retail obtainable (dataset): ${mount.retailObtainable !== false}`,
    mount.sourceCategory ? `Source category: ${mount.sourceCategory}` : "",
    Array.isArray(mount.tags) && mount.tags.length
      ? `Tags: ${mount.tags.join(", ")}`
      : "",
    `Wowhead reference URL (citation context only): ${refUrl}`,
    "",
    `Respond with JSON only: {"lines":["...","..."]} — 1–${MAX_MICRO_LINES} lines, each ≤${MAX_WORDS_PER_LINE} words.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function countWords(s) {
  return String(s)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function stripListMarkers(s) {
  return String(s)
    .trim()
    .replace(/^[•\-\u2013\u2014]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

/** Remove Wowhead/URL text so UI links stay the single source (item page when mapped). */
function stripUrlsFromBullet(s) {
  return String(s)
    .replace(/https?:\/\/(?:www\.)?wowhead\.com\/[^\s)\],]+/gi, "")
    .replace(/https?:\/\/[^\s)\],]+/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[.,;:]\s*|\s*[.,;:]\s*$/g, "")
    .trim();
}

export function normalizeMicroLines(rawLines) {
  const lines = (Array.isArray(rawLines) ? rawLines : [])
    .map((s) => stripUrlsFromBullet(stripListMarkers(s)))
    .filter(Boolean)
    .slice(0, MAX_MICRO_LINES);
  return lines;
}

/**
 * @param {string[]} lines
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateMicroLines(lines) {
  if (!Array.isArray(lines) || lines.length < 1) {
    return { ok: false, reason: "Need at least one line" };
  }
  if (lines.length > MAX_MICRO_LINES) {
    return { ok: false, reason: `At most ${MAX_MICRO_LINES} lines` };
  }
  for (let i = 0; i < lines.length; i++) {
    const w = countWords(lines[i]);
    if (w < 1) {
      return { ok: false, reason: `Line ${i + 1} is empty` };
    }
    if (w > MAX_WORDS_PER_LINE) {
      return {
        ok: false,
        reason: `Line ${i + 1} has ${w} words (max ${MAX_WORDS_PER_LINE}): ${lines[i].slice(0, 80)}`,
      };
    }
  }
  return { ok: true };
}

function usesResponsesApi(model) {
  const m = String(model || "");
  return (
    m.startsWith("gpt-5") ||
    m.startsWith("o3") ||
    m.startsWith("o4")
  );
}

/**
 * Collect assistant-visible text from a Responses API object.
 * GPT-5 can burn the whole max_output budget on reasoning tokens; then `output` may
 * lack `output_text`. Higher max_output + reasoning effort `none` avoids that.
 */
export function extractTextFromResponsesPayload(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  const texts = [];
  const pushParts = (parts) => {
    if (!parts) return;
    if (typeof parts === "string" && parts.trim()) {
      texts.push(parts.trim());
      return;
    }
    if (!Array.isArray(parts)) return;
    for (const p of parts) {
      if (!p || typeof p !== "object") continue;
      if (p.type === "refusal") {
        const r = p.refusal ?? p.message;
        if (typeof r === "string" && r.trim()) {
          throw new Error(`Model refusal: ${r.slice(0, 300)}`);
        }
      }
      const t = p.text;
      if (typeof t !== "string" || !t.trim()) continue;
      const typ = p.type;
      if (
        typ === "output_text" ||
        typ === "text" ||
        typ === undefined ||
        typ === null
      ) {
        texts.push(t.trim());
      }
    }
  };
  const out = data?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      if (!item || typeof item !== "object") continue;
      if (item.type === "message" || item.role === "assistant") {
        pushParts(item.content);
      }
    }
  }
  return texts.length ? texts.join("\n") : "";
}

function responsesDebugSnippet(data) {
  try {
    const types = Array.isArray(data?.output)
      ? data.output.map((x) => x?.type).filter(Boolean)
      : [];
    return JSON.stringify({
      status: data?.status,
      incomplete: data?.incomplete_details,
      error: data?.error,
      outputItemTypes: types,
    }).slice(0, 450);
  } catch {
    return "(unserializable)";
  }
}

async function callResponsesApi({
  apiKey,
  baseUrl,
  model,
  system,
  user,
  reasoningEffort,
}) {
  const url = `${baseUrl.replace(/\/$/, "")}/responses`;
  const envMax = Number(process.env.MOUNT_FLAVOR_MAX_OUTPUT_TOKENS);
  const maxOutputBase =
    Number.isFinite(envMax) && envMax >= 2048 ? envMax : 8192;

  let lastDiag = "";
  for (let r = 0; r < 3; r++) {
    const effort = r === 0 ? reasoningEffort || "none" : "none";
    const maxOut = Math.min(32768, maxOutputBase * 2 ** r);
    const body = {
      model,
      instructions: system,
      input: user,
      text: { format: { type: "json_object" }, verbosity: "low" },
      max_output_tokens: maxOut,
      reasoning: { effort },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`OpenAI Responses HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = JSON.parse(text);
    if (data.error) {
      throw new Error(
        `OpenAI Responses error: ${JSON.stringify(data.error).slice(0, 400)}`,
      );
    }
    if (data.status === "incomplete") {
      lastDiag = responsesDebugSnippet(data);
      continue;
    }
    try {
      const content = extractTextFromResponsesPayload(data);
      if (content) return content;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Model refusal")) throw e;
      throw e;
    }
    lastDiag = responsesDebugSnippet(data);
  }
  throw new Error(
    `No assistant text in Responses payload after retries (${lastDiag})`,
  );
}

async function callChatCompletionsApi({ apiKey, baseUrl, model, system, user }) {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model,
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("No choices[0].message.content in response");
  }
  return content.trim();
}

function parseFlavorJson(content) {
  const trimmed = content.trim();
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Could not parse JSON: ${trimmed.slice(0, 200)}`);
    }
    parsed = JSON.parse(jsonMatch[0]);
  }
  const rawLines = Array.isArray(parsed.lines) ? parsed.lines : [];
  const lines = normalizeMicroLines(rawLines);
  const v = validateMicroLines(lines);
  if (!v.ok) {
    throw new Error(v.reason);
  }
  return { lines };
}

/**
 * @param {{ apiKey: string, baseUrl: string, model: string, user: string, reasoningEffort?: string }} opts
 * @returns {Promise<{ flavor: string, lines: string[] }>}
 */
export async function callOpenAIForMountFlavor(opts) {
  const { apiKey, baseUrl, model, user, reasoningEffort } = opts;
  const system = MOUNT_FLAVOR_SYSTEM;
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const correction =
      attempt === 0
        ? user
        : `${user}\n\nYour previous reply broke rules (wrong length or word count). Reply again with JSON only: {"lines":["..."]} — 1–${MAX_MICRO_LINES} strings, each ≤${MAX_WORDS_PER_LINE} words, no extra keys.`;
    try {
      const content = usesResponsesApi(model)
        ? await callResponsesApi({
            apiKey,
            baseUrl,
            model,
            system,
            user: correction,
            reasoningEffort: reasoningEffort || "none",
          })
        : await callChatCompletionsApi({
            apiKey,
            baseUrl,
            model,
            system,
            user: correction,
          });
      const { lines } = parseFlavorJson(content);
      return { flavor: "", lines };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr;
}
