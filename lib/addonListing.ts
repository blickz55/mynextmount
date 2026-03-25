/**
 * Epic I.1 — single public “install this addon” URL for the website.
 * Set `NEXT_PUBLIC_ADDON_LISTING_URL` in Vercel when the CurseForge/Wago project exists.
 */

const DEFAULT_ADDON_LISTING_URL =
  "https://www.curseforge.com/wow/addons/search?search=MyNextMount";

/** Manual / from-source install (repo path is stable for deep links). */
export const ADDON_INSTALL_DOCS_URL =
  "https://github.com/blickz55/mynextmount/blob/main/docs/addon-install.md";

export function getAddonListingUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ADDON_LISTING_URL;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t !== "") return t;
  }
  return DEFAULT_ADDON_LISTING_URL;
}

/** True when deploy uses a dedicated project page (not the default search URL). */
export function hasCustomAddonListingUrl(): boolean {
  const raw = process.env.NEXT_PUBLIC_ADDON_LISTING_URL;
  return typeof raw === "string" && raw.trim() !== "";
}
