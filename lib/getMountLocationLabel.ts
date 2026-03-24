import type { Mount } from "@/types/mount";
import locationByCategory from "@/data/defaults/location-by-source-category.json";

type CategoryMap = Record<string, string> & { default: string };

/**
 * Label for “where” to get the mount. Prefer explicit `location` from data
 * or overrides; fall back to source category; never show a bare "Unknown"
 * when we can infer acquisition class from Tier-1 metadata.
 */
export function getMountLocationLabel(mount: Mount): string {
  if (mount.tags?.includes("stub")) {
    return "Stub row — run data:build for a real location";
  }

  const loc = mount.location?.trim();
  if (loc && loc !== "Unknown") {
    return mount.location;
  }

  const cat = (mount.sourceCategory || "").toLowerCase().trim();
  const map = locationByCategory as CategoryMap;
  return map[cat] || map.default;
}
