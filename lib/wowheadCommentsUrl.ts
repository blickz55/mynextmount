import type { Mount } from "@/types/mount";

export type WowheadCommentsLinkTarget = {
  href: string;
  /** Item pages match the in-game journal “teach item” where discussion usually lives. */
  pageKind: "item" | "spell";
};

/**
 * Wowhead URL with `#comments` (item page preferred — same context as the journal item / icon flow).
 */
export function resolveWowheadCommentsLink(
  mount: Mount,
): WowheadCommentsLinkTarget | null {
  const itemId = mount.wowheadItemId;
  if (typeof itemId === "number" && Number.isFinite(itemId) && itemId > 0) {
    return {
      href: `https://www.wowhead.com/item=${itemId}#comments`,
      pageKind: "item",
    };
  }
  const c = mount.commentsUrl?.trim();
  const base = c || mount.wowheadUrl?.trim();
  if (!base) return null;
  const path = base.split("#")[0];
  if (!path) return null;
  const href = base.includes("#comments")
    ? base
    : `${path}#comments`;
  return { href, pageKind: "spell" };
}

/** @deprecated Prefer `resolveWowheadCommentsLink` for UI copy that distinguishes item vs spell. */
export function wowheadCommentsUrl(mount: Mount): string | null {
  return resolveWowheadCommentsLink(mount)?.href ?? null;
}

/** Base Wowhead URL for browsing (prefers item page when `wowheadItemId` is set). */
export function wowheadBrowseBaseUrl(mount: Mount): string | null {
  const itemId = mount.wowheadItemId;
  if (typeof itemId === "number" && Number.isFinite(itemId) && itemId > 0) {
    return `https://www.wowhead.com/item=${itemId}`;
  }
  const c = mount.commentsUrl?.trim();
  if (c) return c.split("#")[0] || c;
  const w = mount.wowheadUrl?.trim();
  return w || null;
}
