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
  const retired = mount.retailObtainable === false;
  if (!hasWowhead && !hasDigest && !retired) return null;

  return (
    <details className="mount-result-card__fold expandable-row--farm">
      <summary>
        <span className="sr-only">{mount.name}: </span>
        Quick steps & Wowhead
        {retired ? (
          <span className="expandable-row__summary-suffix"> — no longer obtainable</span>
        ) : null}
      </summary>
      <div className="expandable-row__panel">
        <WowheadCommentDigest mount={mount} />
      </div>
    </details>
  );
}

