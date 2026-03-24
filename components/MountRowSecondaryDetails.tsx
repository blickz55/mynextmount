import { MountGuideBlock } from "@/components/MountGuideBlock";
import { WowheadCommentDigest } from "@/components/WowheadCommentDigest";
import { wowheadCommentsUrl } from "@/lib/wowheadCommentsUrl";
import type { Mount } from "@/types/mount";

function farmSummary(hasGuide: boolean, hasWowhead: boolean): string {
  if (hasGuide && hasWowhead) return "Farm guide, source & community tips";
  if (hasGuide) return "Farm guide & source";
  return "Community tips & Wowhead";
}

/**
 * Epic D.3 — Collapsible secondary detail (guide + Wowhead) so the main line stays scannable.
 */
export function MountFarmSecondaryDetails({ mount }: { mount: Mount }) {
  const hasWowhead = wowheadCommentsUrl(mount) !== null;
  const hasDigest = (mount.wowheadCommentDigest?.length ?? 0) > 0;
  const hasGuide = Boolean(mount.guide);
  if (!hasWowhead && !hasGuide && !hasDigest) return null;

  return (
    <details className="expandable-row expandable-row--farm">
      <summary>{farmSummary(hasGuide, hasWowhead || hasDigest)}</summary>
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
  const hasWowhead = wowheadCommentsUrl(mount) !== null;
  const hasDigest = (mount.wowheadCommentDigest?.length ?? 0) > 0;
  if (!hasWowhead && !hasDigest) return null;

  return (
    <details className="expandable-row expandable-row--rarest">
      <summary>Community tips and Wowhead</summary>
      <div className="expandable-row__panel">
        <WowheadCommentDigest mount={mount} />
      </div>
    </details>
  );
}
