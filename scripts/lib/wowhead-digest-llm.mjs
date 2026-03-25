/**
 * Shared OpenAI chat-completions helper for Wowhead digest paraphrases (Epic D.5).
 */

export const MAX_COMMENTS_IN = 5;
export const MAX_LINES_OUT = 5;

export const DIGEST_LLM_SYSTEM = `You summarize World of Warcraft mount farming discussion for a personal fansite.
Rules:
- Output EXACTLY one JSON object with a single key "lines" (array of strings).
- Emit between 3 and ${MAX_LINES_OUT} strings (fewer only if excerpts are empty or useless).
- Each string is one concise bullet under 220 characters, plain English, for players farming the mount.
- PARAPHRASE only: do NOT copy sentences or distinctive phrases from the excerpts.
- Prefer actionable tips (source, lockout, difficulty, routes) when supported; mark uncertainty ("often", "check current patch") when excerpts conflict.
- No HTML, no markdown list markers inside strings, no leading "• ".
- No insults, no real-world personal data; game advice only.`;

export function buildDigestUserPrompt(
  spellId,
  mountName,
  sourceNote,
  commentTexts,
) {
  const blocks = commentTexts
    .map((t, i) => `--- Excerpt ${i + 1} ---\n${t}`)
    .join("\n\n");
  return [
    `Summon spell ID: ${spellId}`,
    mountName ? `Mount name (from site dataset): ${mountName}` : "",
    `How excerpts were obtained: ${sourceNote}`,
    "",
    `Up to ${MAX_COMMENTS_IN} community comment excerpts (paraphrase targets; do not quote verbatim):`,
    blocks ||
      "(no excerpt text — output 0–2 cautious generic lines suggesting the user check Wowhead for current tips.)",
    "",
    `Respond with JSON only: {"lines":["bullet one","bullet two",...]} (max ${MAX_LINES_OUT} bullets).`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function callOpenAIForDigestLines({ apiKey, baseUrl, model, user }) {
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
        { role: "system", content: DIGEST_LLM_SYSTEM },
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
  return parsed.lines
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, MAX_LINES_OUT);
}
