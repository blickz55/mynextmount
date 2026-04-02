import type { Mount } from "@/types/mount";

/** Shown when batch lore and digest flavor are both absent — matches tooltip copy. */
export const OWNED_MOUNT_NO_LORE_YET_MSG =
  "No story on file for this one yet — we add flavor text over time.";

/**
 * Same precedence as “View Your Mounts” hover (`OwnedMountsCollection` → tooltip):
 * Archivist batch lore (`mountHoverLore`), then Wowhead digest flavor (`wowheadMountFlavor`).
 */
export function resolveOwnedMountLoreTextFromParts(
  prebakedLore?: string | null,
  flavorFallback?: string | null,
): string | null {
  const archivist = prebakedLore?.trim();
  if (archivist) return archivist;
  const fb = flavorFallback?.trim();
  if (fb) return fb;
  return null;
}

export function resolveOwnedMountLoreText(mount: Mount): string | null {
  return resolveOwnedMountLoreTextFromParts(
    mount.mountHoverLore,
    mount.wowheadMountFlavor,
  );
}
