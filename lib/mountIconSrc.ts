import type { Mount } from "@/types/mount";

/**
 * Epic D.2 — Image URL for mount spell icon.
 * Uses **`iconUrl`** only (Blizzard spell media `value`, or merged override — see `docs/mount-icons.md`).
 * We do **not** synthesize URLs from **`iconFileId`** alone: the CDN expects texture filenames, not raw ids.
 */
export function mountIconSrc(mount: Mount): string | null {
  const direct = mount.iconUrl?.trim();
  return direct || null;
}
