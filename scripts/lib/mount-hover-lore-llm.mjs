/**
 * Archivist hover lore (markdown prose). Keep SYSTEM in sync with former lib/openaiMountLore.ts.
 */

import { extractTextFromResponsesPayload } from "./mount-flavor-llm.mjs";
import { loreThemeWithRotation, themeHintForModel } from "./mount-lore-theme.mjs";

export const MOUNT_HOVER_LORE_SYSTEM = `You are the Archivist of the Timeways. You do not summarize; you witness.

Write flash fiction lore (60–90 words) for the World of Warcraft mount the user describes.

Pick ONE dominant narrative angle (do not name the angle—embody it):
• The cost of loyalty: who bled to keep this beast fed; what a prior rider sacrificed.
• The scent of the wild: place through sense—rot, ozone, cold stone, pine smoke—not a travelogue.
• Echoes of history: a small, specific beat—a nameless squire, a cracked horn boss, a splintered standard—not encyclopedic facts.
• The burden carried: memory, unease, warmth against undeath—the mount as witness.

Hard bans (never use these phrases): "Legend says", "In the land of", "Known for", "A loyal companion", "In the world of", "A testament to", "Amidst the chaos", "This mount is", "nestled", "tapestry".

Formatting: Markdown only, no HTML. Use **bold** for places, battles, or names that matter. Use *italics* for instincts, whispers, or half-heard thoughts. Include one line starting with > as a short inscription, epitaph, or barked order when it fits.

Structure: 3–5 sentences. Concrete, sensory, irregular rhythm. No bullet lists.`;

function usesResponsesApi(model) {
  const m = String(model || "");
  return m.startsWith("gpt-5") || m.startsWith("o3") || m.startsWith("o4");
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

async function callResponsesApiPlain({
  apiKey,
  baseUrl,
  model,
  system,
  user,
  reasoningEffort,
}) {
  const url = `${baseUrl.replace(/\/$/, "")}/responses`;
  const envMax = Number(process.env.MOUNT_HOVER_LORE_MAX_OUTPUT_TOKENS);
  const maxOutputBase =
    Number.isFinite(envMax) && envMax >= 256 ? envMax : 900;

  let lastDiag = "";
  for (let r = 0; r < 3; r++) {
    const effort = r === 0 ? reasoningEffort || "none" : "none";
    const maxOut = Math.min(4096, maxOutputBase * 2 ** r);
    const body = {
      model,
      instructions: system,
      input: user,
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
    const content = extractTextFromResponsesPayload(data);
    if (content) return content;
    lastDiag = responsesDebugSnippet(data);
  }
  throw new Error(
    `No assistant text in Responses payload after retries (${lastDiag})`,
  );
}

async function callChatCompletionsPlain({
  apiKey,
  baseUrl,
  model,
  system,
  user,
}) {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model,
    temperature: 0.88,
    max_tokens: 420,
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
  const c = data.choices?.[0]?.message?.content;
  if (typeof c !== "string") throw new Error("No message content");
  return c.trim();
}

export function buildMountHoverLoreUserPrompt(mount) {
  const theme = loreThemeWithRotation(mount, mount.id);
  const mood = themeHintForModel(theme);
  const tags =
    Array.isArray(mount.tags) && mount.tags.length
      ? mount.tags.slice(0, 12).join(", ")
      : "(none listed)";
  return [
    `Mount: ${mount.name}`,
    `Spell id (for your disambiguation only; do not quote numbers): ${mount.id}`,
    `Era / expansion hint: ${mount.expansion || "Unknown"}`,
    `How it is obtained (source): ${String(mount.source || "").trim() || "Unknown"}`,
    `Place or route cue: ${String(mount.location || "").trim() || "Unknown"}`,
    `Tags: ${tags}`,
    `Prose mood to lean into (sensory, not labels): ${mood}`,
    `Write the flash fiction now.`,
  ].join("\n");
}

function normalizeLoreText(s) {
  let t = String(s).trim();
  t = t.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "");
  return t.trim();
}

function validateLoreText(t) {
  if (t.length < 25) return { ok: false, reason: "Too short" };
  if (t.length > 4000) return { ok: false, reason: "Too long" };
  if (/<\s*\w+[\s>]/.test(t)) return { ok: false, reason: "HTML-like content" };
  return { ok: true };
}

/**
 * @param {{ apiKey: string, baseUrl: string, model: string, user: string, reasoningEffort?: string }} opts
 */
export async function callOpenAIForMountHoverLore(opts) {
  const { apiKey, baseUrl, model, user, reasoningEffort } = opts;
  const system = MOUNT_HOVER_LORE_SYSTEM;
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const correction =
      attempt === 0
        ? user
        : `${user}\n\nYour previous reply was invalid. Reply with 60–90 words of Markdown prose only (3–5 sentences), no bullet lists, no HTML.`;
    try {
      const raw = usesResponsesApi(model)
        ? await callResponsesApiPlain({
            apiKey,
            baseUrl,
            model,
            system,
            user: correction,
            reasoningEffort: reasoningEffort || "none",
          })
        : await callChatCompletionsPlain({
            apiKey,
            baseUrl,
            model,
            system,
            user: correction,
          });
      const lore = normalizeLoreText(raw);
      const v = validateLoreText(lore);
      if (!v.ok) throw new Error(v.reason);
      return { lore };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr;
}
