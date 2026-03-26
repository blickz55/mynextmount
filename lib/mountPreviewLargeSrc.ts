/**
 * Epic I.4 — Optional larger texture URL for the same spell icon (see `docs/adr-013-mount-preview-beyond-spell-icon.md`).
 * The browser must fall back to the original `iconUrl` on `error` if the CDN rejects the path.
 */
export function largerSpellIconCandidate(iconUrl: string): string {
  const u = iconUrl.trim();
  if (!u) return u;

  const blizzard56 = u.match(
    /^(https:\/\/render\.worldofwarcraft\.com\/[^/]+\/icons\/)56(\/[^?#]+\.jpe?g)(\?[^#]*)?(#.*)?$/i,
  );
  if (blizzard56) {
    return `${blizzard56[1]}128${blizzard56[2]}${blizzard56[3] ?? ""}${blizzard56[4] ?? ""}`;
  }

  const zam = u.replace(
    /\/images\/wow\/icons\/(small|medium)\//i,
    "/images/wow/icons/large/",
  );
  if (zam !== u) return zam;

  return u;
}
