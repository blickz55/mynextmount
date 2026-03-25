import { MountGuideBlock } from "@/components/MountGuideBlock";
import { WowheadCommentDigest } from "@/components/WowheadCommentDigest";
import { resolveWowheadCommentsLink } from "@/lib/wowheadCommentsUrl";
import type { Mount } from "@/types/mount";

function farmSummary(hasGuide: boolean, hasSpotlightPanel: boolean): string {
  if (hasGuide && hasSpotlightPanel) return "Farm guide & mount spotlight";
  if (hasGuide) return "Farm guide & source";
  return "Mount spotlight";
}

function mountHasSpotlightCopy(m: Mount): boolean {
  const lines = m.wowheadCommentDigest?.length ?? 0;
  return Boolean(m.wowheadMountFlavor?.trim()) || lines > 0;
}

/**
 * Epic D.3 — Collapsible secondary detail (guide + Wowhead) so the main line stays scannable.
 */
export function MountFarmSecondaryDetails({ mount }: { mount: Mount }) {
  const hasWowhead = resolveWowheadCommentsLink(mount) !== null;
  const hasDigest = mountHasSpotlightCopy(mount);
  const hasGuide = Boolean(mount.guide);
  if (!hasWowhead && !hasGuide && !hasDigest) return null;

  return (
    <details className="expandable-row expandable-row--farm">
      <summary>
        <span className="sr-only">{mount.name}: </span>
        {farmSummary(hasGuide, hasWowhead || hasDigest)}
      </summary>
      <div className="expandable-row__panel">
        <MountGuideBlock mount={mount} />
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
        Mount spotlight & Wowhead
      </summary>
      <div className="expandable-row__panel">
        <WowheadCommentDigest mount={mount} />
      </div>
    </details>
  );
}
