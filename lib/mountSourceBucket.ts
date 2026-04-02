import type { Mount } from "@/types/mount";

/** Matches "Marks of Honor" or "Mark of Honor" (case-insensitive). */
const MARKS_OF_HONOR_RE = /marks?\s+of\s+honor/i;

/** Nagrand Halaa PvP hub / battle tokens (case-insensitive). */
const HALAA_RE = /\bhalaa\b/i;

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
  | "marksofhonor"
  /** Opt-in: mounts whose Quick steps / guide text mention Halaa (Nagrand PvP tokens). */
  | "halaa";

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
 * Text used for “Quick steps”-style gates (digest, flavor, in-app guide).
 * Keep in sync across {@link mountQuickStepsMentionMarksOfHonor} and
 * {@link mountQuickStepsMentionHalaa}.
 */
export function mountQuickStepsTextChunks(mount: Mount): string[] {
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
  return chunks;
}

/**
 * True when merged **Quick steps** text (digest bullets, optional flavor) or the
 * mount **guide** (overview + checklist) mentions Marks of Honor as a requirement.
 */
export function mountQuickStepsMentionMarksOfHonor(mount: Mount): boolean {
  return mountQuickStepsTextChunks(mount).some((t) =>
    MARKS_OF_HONOR_RE.test(t),
  );
}

/**
 * True when the same text corpus mentions **Halaa** (battle / research tokens, capture PvP).
 */
export function mountQuickStepsMentionHalaa(mount: Mount): boolean {
  return mountQuickStepsTextChunks(mount).some((t) => HALAA_RE.test(t));
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
  if (mountQuickStepsMentionHalaa(mount) && !filters.halaa) {
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

/**
 * “Farmable” recommendation mode (`efficient`): only drops (world, dungeon, raid kills)
 * and vendor NPCs (reputation, gold, or currency — Blizzard buckets all as Vendor).
 * Quests, achievements, shop, trading post, professions, TCG, promotions, world events,
 * discovery, and other categories are excluded.
 */
export function mountPassesFarmableModeAcquisition(mount: Mount): boolean {
  const b = getMountSourceBucket(mount);
  return b === "drop" || b === "vendor";
}

/** Checkbox order + customer-facing labels */
export const SOURCE_FILTER_OPTIONS: readonly {
  id: SourceBucketId;
  label: string;
}[] = [
  { id: "drop", label: "Drops (open world, dungeons, raids)" },
  { id: "vendor", label: "Vendors" },
  {
    id: "marksofhonor",
    label: "Marks of Honor (PvP currency)",
  },
  {
    id: "halaa",
    label: "Halaa (Nagrand PvP tokens)",
  },
  { id: "quest", label: "Quests" },
  { id: "achievement", label: "Achievements" },
  { id: "petstore", label: "In-game shop" },
  { id: "tradingpost", label: "Trading Post" },
  { id: "promotion", label: "Promos & giveaways" },
  { id: "profession", label: "Professions" },
  { id: "tcg", label: "TCG / old codes" },
  { id: "worldevent", label: "Holidays & events" },
  { id: "discovery", label: "Secrets & puzzles" },
  { id: "other", label: "Everything else" },
] as const;

export function initialSourceFiltersAllOn(): Record<SourceBucketId, boolean> {
  const o = {} as Record<SourceBucketId, boolean>;
  for (const { id } of SOURCE_FILTER_OPTIONS) {
    o[id] = true;
  }
  return o;
}

/** Unchecked for new sessions until the user opts in (shop, promos, MoH, Halaa). */
export const SOURCE_FILTER_OPT_IN_OFF_BY_DEFAULT: readonly SourceBucketId[] = [
  "petstore",
  "promotion",
  "marksofhonor",
  "halaa",
];

/**
 * Farm list default: all acquisition buckets on except opt-in toggles in
 * {@link SOURCE_FILTER_OPT_IN_OFF_BY_DEFAULT}.
 */
export function initialSourceFiltersDefault(): Record<SourceBucketId, boolean> {
  const o = initialSourceFiltersAllOn();
  for (const id of SOURCE_FILTER_OPT_IN_OFF_BY_DEFAULT) {
    o[id] = false;
  }
  return o;
}

export function anySourceFilterEnabled(
  filters: Record<SourceBucketId, boolean>,
): boolean {
  return SOURCE_FILTER_OPTIONS.some(({ id }) => filters[id]);
}
