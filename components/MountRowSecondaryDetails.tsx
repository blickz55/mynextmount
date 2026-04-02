import { WowheadCommentDigest } from "@/components/WowheadCommentDigest";
import { resolveWowheadCommentsLink } from "@/lib/wowheadCommentsUrl";
import type { Mount } from "@/types/mount";

function mountHasSpotlightCopy(m: Mount): boolean {
  const lines = m.wowheadCommentDigest?.length ?? 0;
  return Boolean(m.wowheadMountFlavor?.trim()) || lines > 0;
}

/**
 * Epic D.3 — Quick steps + Wowhead always visible on the farm list (no details/summary).
 */
export function MountFarmSecondaryDetails({ mount }: { mount: Mount }) {
  const hasWowhead = resolveWowheadCommentsLink(mount) !== null;
  const hasDigest = mountHasSpotlightCopy(mount);
  const retired = mount.retailObtainable === false;
  if (!hasWowhead && !hasDigest && !retired) return null;

  const headingId = `mount-quicksteps-${mount.id}`;

  return (
    <section
      className="mount-result-card__quicksteps expandable-row--farm"
      aria-labelledby={headingId}
    >
      <h4 className="mount-result-card__quicksteps__title" id={headingId}>
        <span className="sr-only">{mount.name}: </span>
        Quick steps & Wowhead
        {retired ? (
          <span className="expandable-row__summary-suffix">
            {" "}
            — no longer obtainable
          </span>
        ) : null}
      </h4>
      <div className="expandable-row__panel mount-result-card__quicksteps__panel">
        <WowheadCommentDigest mount={mount} />
      </div>
    </section>
  );
}

