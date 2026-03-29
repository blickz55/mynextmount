import type { MountLoreTheme } from "@/lib/mountLoreTheme";
import { themeHintForModel } from "@/lib/mountLoreTheme";

const SYSTEM_PROMPT = `You are the Archivist of the Timeways. You do not summarize; you witness.

Write flash fiction lore (60–90 words) for the World of Warcraft mount the user describes.

Pick ONE dominant narrative angle (do not name the angle—embody it):
• The cost of loyalty: who bled to keep this beast fed; what a prior rider sacrificed.
• The scent of the wild: place through sense—rot, ozone, cold stone, pine smoke—not a travelogue.
• Echoes of history: a small, specific beat—a nameless squire, a cracked horn boss, a splintered standard—not encyclopedic facts.
• The burden carried: memory, unease, warmth against undeath—the mount as witness.

Hard bans (never use these phrases): "Legend says", "In the land of", "Known for", "A loyal companion", "In the world of", "A testament to", "Amidst the chaos", "This mount is", "nestled", "tapestry".

Formatting: Markdown only, no HTML. Use **bold** for places, battles, or names that matter. Use *italics* for instincts, whispers, or half-heard thoughts. Include one line starting with > as a short inscription, epitaph, or barked order when it fits.

Structure: 3–5 sentences. Concrete, sensory, irregular rhythm. No bullet lists.`;

export type MountLoreRequestBody = {
  spellId: number;
  mountName: string;
  expansion: string;
  source?: string;
  location?: string;
  tags?: string[];
  theme: MountLoreTheme;
};

export function resolveMountLoreEnv(): {
  apiKey: string | null;
  model: string;
  baseUrl: string;
} {
  const apiKey =
    process.env.MOUNT_LORE_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null;
  const model =
    process.env.MOUNT_LORE_LLM_MODEL?.trim() || "gpt-4o-mini";
  const baseUrl =
    process.env.MOUNT_LORE_OPENAI_BASE_URL?.trim() ||
    "https://api.openai.com/v1";
  return { apiKey, model, baseUrl };
}

function buildUserMessage(input: MountLoreRequestBody): string {
  const mood = themeHintForModel(input.theme);
  const tags =
    Array.isArray(input.tags) && input.tags.length
      ? input.tags.slice(0, 12).join(", ")
      : "(none listed)";
  return [
    `Mount: ${input.mountName}`,
    `Spell id (for your disambiguation only; do not quote numbers): ${input.spellId}`,
    `Era / expansion hint: ${input.expansion || "Unknown"}`,
    `How it is obtained (source): ${input.source?.trim() || "Unknown"}`,
    `Place or route cue: ${input.location?.trim() || "Unknown"}`,
    `Tags: ${tags}`,
    `Prose mood to lean into (sensory, not labels): ${mood}`,
    `Write the flash fiction now.`,
  ].join("\n");
}

export async function fetchMountLoreFromOpenAI(
  input: MountLoreRequestBody,
): Promise<{ lore: string } | { error: string }> {
  const { apiKey, model, baseUrl } = resolveMountLoreEnv();
  if (!apiKey) {
    return { error: "OPENAI_API_KEY is not configured for mount lore." };
  }

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model,
    temperature: 0.88,
    max_tokens: 420,
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: buildUserMessage(input) },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!res.ok) {
    const msg =
      typeof raw.error?.message === "string"
        ? raw.error.message
        : `OpenAI error (${res.status})`;
    return { error: msg };
  }

  const text = raw.choices?.[0]?.message?.content?.trim();
  if (!text) {
    return { error: "Empty response from the model." };
  }

  return { lore: text };
}
