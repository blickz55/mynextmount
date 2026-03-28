import { WowheadCommentDigest } from "@/components/WowheadCommentDigest";
import { resolveWowheadCommentsLink } from "@/lib/wowheadCommentsUrl";
import type { Mount } from "@/types/mount";

function mountHasSpotlightCopy(m: Mount): boolean {
  const lines = m.wowheadCommentDigest?.length ?? 0;
  return Boolean(m.wowheadMountFlavor?.trim()) || lines > 0;
}

/**
 * Epic D.3 — Collapsible quick steps + Wowhead (farm list); mount-guides.json is unused here.
 */
export function MountFarmSecondaryDetails({ mount }: { mount: Mount }) {
  const hasWowhead = resolveWowheadCommentsLink(mount) !== null;
  const hasDigest = mountHasSpotlightCopy(mount);
  if (!hasWowhead && !hasDigest) return null;

  return (
    <details className="expandable-row expandable-row--farm">
      <summary>
        <span className="sr-only">{mount.name}: </span>
        Quick steps & Wowhead
      </summary>
      <div className="expandable-row__panel">
        <WowheadCommentDigest mount={mount} />
      </div>
    </details>
  );
}

/**
 * Epic D.3 — Wowhead link tucked under a disclosure for a compact scan line.
 */
export function MountRarestSecondaryDetails({ mount }: { mount: Mount }) {
  const hasWowhead = resolveWowheadCommentsLink(mount) !== null;
  const hasDigest = mountHasSpotlightCopy(mount);
  if (!hasWowhead && !hasDigest) return null;

  return (
    <details className="expandable-row expandable-row--rarest">
      <summary>
        <span className="sr-only">{mount.name}: </span>
        Quick steps & Wowhead
      </summary>
      <div className="expandable-row__panel">
        <WowheadCommentDigest mount={mount} />
      </div>
    </details>
  );
}
