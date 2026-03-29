import { NextResponse } from "next/server";

import type { MountLoreTheme } from "@/lib/mountLoreTheme";
import {
  fetchMountLoreFromOpenAI,
  resolveMountLoreEnv,
} from "@/lib/openaiMountLore";

export const runtime = "nodejs";

const THEMES = new Set<MountLoreTheme>([
  "default",
  "shadowlands",
  "northrend",
  "outland",
  "dragonflight",
  "kalimdor",
  "pandaria",
  "brokenIsles",
  "zandalar",
  "kulTiras",
  "fel",
  "arcane",
  "life",
]);

function clampStr(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const t = s.trim().slice(0, max);
  return t;
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim().slice(0, 48);
    if (t) out.push(t);
    if (out.length >= 16) break;
  }
  return out;
}

export async function POST(req: Request) {
  const { apiKey } = resolveMountLoreEnv();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "NO_API_KEY",
        message:
          "Mount lore needs OPENAI_API_KEY or MOUNT_LORE_OPENAI_API_KEY in the server environment.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;

  const spellId = Number(o.spellId);
  if (!Number.isFinite(spellId) || spellId < 1 || spellId > 2 ** 31 - 1) {
    return NextResponse.json({ ok: false, error: "Invalid spellId" }, { status: 400 });
  }

  const mountName = clampStr(o.mountName, 120);
  if (!mountName) {
    return NextResponse.json({ ok: false, error: "mountName required" }, { status: 400 });
  }

  const themeRaw = clampStr(o.theme, 32);
  const theme = THEMES.has(themeRaw as MountLoreTheme)
    ? (themeRaw as MountLoreTheme)
    : "default";

  const expansion = clampStr(o.expansion, 64) || "Unknown";
  const source = clampStr(o.source, 200);
  const location = clampStr(o.location, 200);
  const tags = normalizeTags(o.tags);

  try {
    const result = await fetchMountLoreFromOpenAI({
      spellId: Math.floor(spellId),
      mountName,
      expansion,
      source: source || undefined,
      location: location || undefined,
      tags: tags.length ? tags : undefined,
      theme,
    });

    if ("error" in result) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      lore: result.lore,
      theme,
    });
  } catch (e) {
    console.error("[api/generate-lore]", e);
    return NextResponse.json(
      { ok: false, error: "Could not generate lore." },
      { status: 500 },
    );
  }
}
