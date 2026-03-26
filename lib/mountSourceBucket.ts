import type { Mount } from "@/types/mount";

/** Normalized acquisition bucket for UI filters (maps Blizzard/API source + sourceCategory). */
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
  | "other";

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
 * which is opt-in (high EV-style score but real-money cost).
 */
export function initialSourceFiltersDefault(): Record<SourceBucketId, boolean> {
  const o = initialSourceFiltersAllOn();
  o.petstore = false;
  return o;
}

export function anySourceFilterEnabled(
  filters: Record<SourceBucketId, boolean>,
): boolean {
  return SOURCE_FILTER_OPTIONS.some(({ id }) => filters[id]);
}
