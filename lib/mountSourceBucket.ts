import type { Mount } from "@/types/mount";

/** Matches "Marks of Honor" or "Mark of Honor" (case-insensitive). */
const MARKS_OF_HONOR_RE = /marks?\s+of\s+honor/i;

/**
 * Normalized acquisition bucket for UI filters (maps Blizzard/API source + sourceCategory).
 * Curated `sourceCategory` patches: `data/overrides/farm-source-bucket.json` (merged into mounts.json).
 */
export type SourceBucketId =
  | "drop"
  | "vendor"
  | "quest"
  | "achievement"
  | "petstore"
  | "tradingpost"
  | "promotion"
  | "profession"
  | "tcg"
  | "worldevent"
  | "discovery"
  | "other"
  /** Opt-in: mounts whose Quick steps / digest text mention Marks of Honor (not a Blizzard sourceCategory). */
  | "marksofhonor";

const PREFIX_TO_BUCKET: Record<string, SourceBucketId> = {
  VENDOR: "vendor",
  DROP: "drop",
  QUEST: "quest",
  ACHIEVEMENT: "achievement",
  PETSTORE: "petstore",
  PROMOTION: "promotion",
  PROFESSION: "profession",
  TCG: "tcg",
  TRADINGPOST: "tradingpost",
  WORLDEVENT: "worldevent",
  DISCOVERY: "discovery",
  RETAIL: "other",
};

const VALID_CATEGORY = new Set<string>([
  "achievement",
  "discovery",
  "drop",
  "petstore",
  "profession",
  "promotion",
  "quest",
  "tcg",
  "tradingpost",
  "vendor",
  "worldevent",
]);

/**
 * True when merged **Quick steps** text (digest bullets, optional flavor) or the
 * mount **guide** (overview + checklist) mentions Marks of Honor as a requirement.
 */
export function mountQuickStepsMentionMarksOfHonor(mount: Mount): boolean {
  const chunks: string[] = [];
  if (Array.isArray(mount.wowheadCommentDigest)) {
    for (const line of mount.wowheadCommentDigest) {
      if (typeof line === "string" && line.trim()) chunks.push(line);
    }
  }
  if (
    typeof mount.wowheadMountFlavor === "string" &&
    mount.wowheadMountFlavor.trim()
  ) {
    chunks.push(mount.wowheadMountFlavor);
  }
  const g = mount.guide;
  if (typeof g?.overview === "string" && g.overview.trim()) {
    chunks.push(g.overview);
  }
  if (Array.isArray(g?.checklist)) {
    for (const line of g.checklist) {
      if (typeof line === "string" && line.trim()) chunks.push(line);
    }
  }
  return chunks.some((t) => MARKS_OF_HONOR_RE.test(t));
}

/**
 * Acquisition bucket match **and** optional Marks-of-Honor gate (checkbox opt-in).
 */
export function mountPassesSourceFilters(
  mount: Mount,
  filters: Record<SourceBucketId, boolean>,
): boolean {
  if (!filters[getMountSourceBucket(mount)]) return false;
  if (mountQuickStepsMentionMarksOfHonor(mount) && !filters.marksofhonor) {
    return false;
  }
  return true;
}

export function getMountSourceBucket(mount: Mount): SourceBucketId {
  if (
    typeof mount.sourceCategory === "string" &&
    mount.sourceCategory.length > 0
  ) {
    const k = mount.sourceCategory.toLowerCase();
    if (VALID_CATEGORY.has(k)) {
      return k as SourceBucketId;
    }
  }
  const prefix = (mount.source || "").split(" — ")[0].trim().toUpperCase();
  return PREFIX_TO_BUCKET[prefix] ?? "other";
}

/** Checkbox order + customer-facing labels */
export const SOURCE_FILTER_OPTIONS: readonly {
  id: SourceBucketId;
  label: string;
}[] = [
  { id: "drop", label: "Drops (raid, dungeon, world)" },
  { id: "vendor", label: "Vendor" },
  {
    id: "marksofhonor",
    label: "Marks of Honor / PVP",
  },
  { id: "quest", label: "Quest" },
  { id: "achievement", label: "Achievement" },
  { id: "petstore", label: "In-Game Shop (Battle.net)" },
  { id: "tradingpost", label: "Trading Post" },
  { id: "promotion", label: "Promotion" },
  { id: "profession", label: "Profession" },
  { id: "tcg", label: "TCG" },
  { id: "worldevent", label: "World Event" },
  { id: "discovery", label: "Discovery" },
  { id: "other", label: "Other" },
] as const;

export function initialSourceFiltersAllOn(): Record<SourceBucketId, boolean> {
  const o = {} as Record<SourceBucketId, boolean>;
  for (const { id } of SOURCE_FILTER_OPTIONS) {
    o[id] = true;
  }
  return o;
}

/**
 * Farm list default: all acquisition buckets on except **in-game shop** (`petstore`),
 * **promotion**, and **Marks of Honor / PVP** (`marksofhonor`) — all opt-in.
 */
export function initialSourceFiltersDefault(): Record<SourceBucketId, boolean> {
  const o = initialSourceFiltersAllOn();
  o.petstore = false;
  o.promotion = false;
  o.marksofhonor = false;
  return o;
}

export function anySourceFilterEnabled(
  filters: Record<SourceBucketId, boolean>,
): boolean {
  return SOURCE_FILTER_OPTIONS.some(({ id }) => filters[id]);
}
