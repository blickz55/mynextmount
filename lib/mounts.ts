import mountsData from "@/data/mounts.json";
import mountsStubsData from "@/data/mounts.stubs.json";
import farmTipsData from "@/data/farm-tips.json";
import mountGuidesData from "@/data/mount-guides.json";
import mountIconOverrides from "@/data/mount-icon-overrides.json";
import wowheadItemBySpell from "@/data/overrides/wowhead-item-by-spell.json";
import wowheadCommentDigests from "@/data/wowhead-comment-digests.json";
import type { Mount } from "@/types/mount";
import type { MountGuide } from "@/types/mountGuide";

function asMountArray(data: unknown): Mount[] {
  if (Array.isArray(data)) {
    return data as Mount[];
  }
  if (
    data !== null &&
    typeof data === "object" &&
    "default" in data &&
    Array.isArray((data as { default: unknown }).default)
  ) {
    return (data as { default: Mount[] }).default;
  }
  return [];
}

/** Canonical API baseline + dev stubs (Epic B.7); `mounts.json` wins on id collision. */
function mergeCanonicalAndStubs(): Mount[] {
  const main = asMountArray(mountsData);
  const stubList = asMountArray(mountsStubsData);
  const mainIds = new Set(main.map((m) => m.id));
  const stubById = new Map<number, Mount>();
  for (const s of stubList) {
    if (mainIds.has(s.id)) continue;
    stubById.set(s.id, s);
  }
  const merged = [...main, ...stubById.values()];
  merged.sort((a, b) => a.id - b.id);
  return merged;
}

/** Prefer `data/overrides/wowhead-item-by-spell.json`, then optional `wowheadItemId` on the row. */
function mergeWowheadItemPage(mount: Mount): Mount {
  const map = wowheadItemBySpell as Record<string, unknown>;
  const fromMap = Number(map[String(mount.id)]);
  if (Number.isFinite(fromMap) && fromMap > 0) {
    return { ...mount, wowheadItemId: fromMap };
  }
  if (
    typeof mount.wowheadItemId === "number" &&
    Number.isFinite(mount.wowheadItemId) &&
    mount.wowheadItemId > 0
  ) {
    return mount;
  }
  return mount;
}

function mergeFarmTips(mount: Mount): Mount {
  if (!/^\d+$/.test(String(mount.id))) return mount;
  const tip = (farmTipsData as Record<string, string>)[String(mount.id)];
  if (typeof tip !== "string" || !tip.trim()) return mount;
  return { ...mount, farmTip: tip.trim() };
}

type GuidesFile = {
  guides?: Record<
    string,
    {
      overview?: string;
      checklist?: string[];
      sourceUrl?: string;
      sourceLabel?: string;
    }
  >;
};

function mergeGuide(mount: Mount): Mount {
  const g = (mountGuidesData as GuidesFile).guides?.[String(mount.id)];
  if (!g?.overview?.trim() || !Array.isArray(g.checklist) || !g.sourceUrl?.trim()) {
    return mount;
  }
  const itemId = mount.wowheadItemId;
  const useItem =
    typeof itemId === "number" && Number.isFinite(itemId) && itemId > 0;
  const sourceUrl = useItem
    ? `https://www.wowhead.com/item=${itemId}`
    : g.sourceUrl.trim();
  const sourceLabel = useItem
    ? `Wowhead — ${mount.name} (item)`
    : (g.sourceLabel || "Source").trim();
  const guide: MountGuide = {
    overview: g.overview.trim(),
    checklist: g.checklist.map((s) => String(s)),
    sourceUrl,
    sourceLabel,
  };
  return { ...mount, guide };
}

type IconOverrideRow = { iconUrl?: string };

/** Epic D.2 — Spell API often 404s mount summon ids; static ZAM URLs for pilot rows (see docs/mount-icons.md). */
function mergeIconOverride(mount: Mount): Mount {
  if (mount.iconUrl?.trim()) return mount;
  const row = (mountIconOverrides as Record<string, IconOverrideRow>)[String(mount.id)];
  const url = typeof row?.iconUrl === "string" ? row.iconUrl.trim() : "";
  if (!url) return mount;
  return { ...mount, iconUrl: url };
}

const DIGEST_MAX_LINES = 5;

type DigestRow = { asOf?: string; lines?: unknown; flavor?: unknown };

/** Epic D.5 — Optional flavor + up to five acquisition bullets from `data/wowhead-comment-digests.json`. */
function mergeWowheadCommentDigest(mount: Mount): Mount {
  const row = (wowheadCommentDigests as Record<string, DigestRow>)[String(mount.id)];
  if (!row) return mount;
  const lines = Array.isArray(row.lines)
    ? row.lines
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, DIGEST_MAX_LINES)
    : [];
  const flavor =
    typeof row.flavor === "string" ? row.flavor.trim() : "";
  if (lines.length === 0 && !flavor) return mount;
  const asOf = typeof row.asOf === "string" ? row.asOf.trim() : "";
  return {
    ...mount,
    ...(lines.length ? { wowheadCommentDigest: lines } : {}),
    ...(flavor ? { wowheadMountFlavor: flavor } : {}),
    ...(asOf ? { wowheadCommentDigestAsOf: asOf } : {}),
  };
}

/** All mounts from static data; use this from recommendation / filter logic. */
export const mounts: Mount[] = mergeCanonicalAndStubs()
  .map(mergeWowheadItemPage)
  .map(mergeFarmTips)
  .map(mergeGuide)
  .map(mergeIconOverride)
  .map(mergeWowheadCommentDigest);

export type { Mount } from "@/types/mount";
