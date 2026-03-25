/**
 * OpenAI JSON output for mount flavor + acquisition copy (no third-party scraping).
 */

export const MAX_ACQUISITION_LINES = 10;
export const MAX_TOTAL_WORDS = 500;

export const MOUNT_FLAVOR_SYSTEM = `You write original, engaging copy for a World of Warcraft mount collection fansite (Retail-focused).
Output EXACTLY one JSON object (no markdown code fence) with keys:
- "flavor": string — 2–5 sentences of vivid but accurate flavor about the mount (how it fits the world, why collectors care, tone warm and readable). Plain text only inside this string (no markdown headings, no HTML). You may use at most two emojis in the whole response, total.
- "lines": array of 4–10 strings — practical bullets on how a player can obtain or farm the mount today (vendors, drops, achievements, shop, PvP, removed/legacy status, etc.).

Hard rules:
- Total word count of "flavor" plus all strings in "lines" combined must be at most ${MAX_TOTAL_WORDS} words. Stay under this cap.
- Each line is one bullet: plain English, no leading "• " or "- ", no HTML, prefer under 220 characters per line but clarity beats brevity.
- Use cautious phrasing when rules vary by patch ("typically", "check the in-game mount journal", "as of recent Retail").
- Do not invent exact drop percentages, guaranteed dates, or secret GMs. Do not claim you read Wowhead or scraped comments.
- If retailObtainable is false in the prompt, say clearly that it is legacy / unobtainable or only via special means, without promising return windows.
- Game content only; no real-world politics, slurs, or personal data.`;

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
    : mount.wowheadUrl?.trim() || `(no item id mapped; spell page would be https://www.wowhead.com/spell=${mount.id})`;

  return [
    `Summon spell id: ${mount.id}`,
    `Name: ${mount.name}`,
    `Source field: ${mount.source}`,
    mount.boss ? `Boss: ${mount.boss}` : "",
    `Location: ${mount.location}`,
    `Expansion: ${mount.expansion}`,
    `Lockout: ${mount.lockout}`,
    `Difficulty (1–5 scale in data): ${mount.difficulty}`,
    `Drop rate hint (1–5 scale in data): ${mount.dropRate}`,
    `Time-to-complete hint (minutes, heuristic): ${mount.timeToComplete}`,
    `Retail obtainable (dataset): ${mount.retailObtainable !== false}`,
    mount.sourceCategory ? `Source category: ${mount.sourceCategory}` : "",
    Array.isArray(mount.tags) && mount.tags.length
      ? `Tags: ${mount.tags.join(", ")}`
      : "",
    `Wowhead reference URL (citation context only): ${refUrl}`,
    "",
    `Respond with JSON only: {"flavor":"...","lines":["first bullet","second bullet",...]} — max ${MAX_TOTAL_WORDS} words total, at most ${MAX_ACQUISITION_LINES} lines.`,
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

export function totalWordsForFlavorPayload(flavor, lines) {
  let n = countWords(flavor);
  for (const line of lines) n += countWords(line);
  return n;
}

/**
 * @param {{ apiKey: string, baseUrl: string, model: string, user: string }} opts
 * @returns {Promise<{ flavor: string, lines: string[] }>}
 */
export async function callOpenAIForMountFlavor(opts) {
  const { apiKey, baseUrl, model, user } = opts;
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MOUNT_FLAVOR_SYSTEM },
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
  const parsed = JSON.parse(content.trim());
  const flavor = typeof parsed.flavor === "string" ? parsed.flavor.trim() : "";
  const rawLines = Array.isArray(parsed.lines) ? parsed.lines : [];
  const lines = rawLines
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, MAX_ACQUISITION_LINES);
  if (!flavor || lines.length < 1) {
    throw new Error(
      `Model returned empty flavor or no lines: ${content.slice(0, 300)}`,
    );
  }
  const words = totalWordsForFlavorPayload(flavor, lines);
  if (words > MAX_TOTAL_WORDS) {
    throw new Error(
      `Model exceeded ${MAX_TOTAL_WORDS} words (${words}); retry or tighten prompt.`,
    );
  }
  return { flavor, lines };
}
