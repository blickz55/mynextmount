"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { MountCommunityHeadBadge } from "@/components/mount-community/MountCommunityHeadBadge";
import { MountCommunityProvider } from "@/components/mount-community/MountCommunityProvider";
import { MountCommunitySection } from "@/components/mount-community/MountCommunitySection";
import { MountPanelFeedback } from "@/components/mount-community/MountPanelFeedback";
import { MountIcon } from "@/components/MountIcon";
import { MountFarmSecondaryDetails } from "@/components/MountRowSecondaryDetails";
import { buildRecommendationReason } from "@/lib/buildRecommendationReason";
import { getMountLocationLabel } from "@/lib/getMountLocationLabel";
import { scoreForRecommendationMode } from "@/lib/scoring";
import { LIST_VIRTUALIZE_MIN } from "@/lib/virtualizeThresholds";
import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

/** Collapsed-row guess; `measureElement` corrects when rows expand (details open). */
const FARM_ROW_ESTIMATE_PX = 152;

function FarmResultCardBody({
  mount,
  mode,
}: {
  mount: Mount;
  mode: RecommendationMode;
}) {
  const scored = scoreForRecommendationMode(mount, mode);
  return (
    <>
      <div className="mount-result-card__head">
        <MountIcon mount={mount} />
        <strong>{mount.name}</strong>
        <MountCommunityHeadBadge spellId={mount.id} />
      </div>
      <div className="mount-result-card__line">
        Location: {getMountLocationLabel(mount)}
      </div>
      {mount.boss !== undefined && mount.boss !== "" && (
        <div className="mount-result-card__line">Boss: {mount.boss}</div>
      )}
      <div className="mount-result-card__line">
        Why: {buildRecommendationReason(mount, mode)}
      </div>
      <details className="mount-result-card__scoring">
        <summary>Score ({scored.score.toFixed(4)})</summary>
        <ul className="mount-result-card__scoring-list">
          {scored.reasons.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </details>
      <MountFarmSecondaryDetails mount={mount} />
      <MountCommunitySection spellId={mount.id} mountName={mount.name} />
    </>
  );
}

type Props = {
  mounts: Mount[];
  mode: RecommendationMode;
};

function FarmRecommendationsListPlain({ mounts, mode }: Props) {
  return (
    <ol className="mount-results-list">
      {mounts.map((mount) => (
        <li key={mount.id} className="mount-result-card mount-result-card--community">
          <MountPanelFeedback spellId={mount.id} mountName={mount.name} />
          <FarmResultCardBody mount={mount} mode={mode} />
        </li>
      ))}
    </ol>
  );
}

function FarmRecommendationsListWindowed({ mounts, mode }: Props) {
  const virtualizer = useWindowVirtualizer({
    count: mounts.length,
    estimateSize: () => FARM_ROW_ESTIMATE_PX,
    overscan: 8,
    getItemKey: (index) => mounts[index]!.id,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      className="mount-results-list mount-results-list--virtual"
      role="list"
      aria-label="Top mounts to farm"
    >
      <div
        className="mount-results-list__virtual-sizer"
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualRows.map((vRow) => {
          const mount = mounts[vRow.index]!;
          return (
            <div
              key={vRow.key}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              role="listitem"
              className="mount-results-list__virtual-row"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              <div
                className="mount-result-card mount-result-card--community"
                data-farm-rank={vRow.index + 1}
              >
                <MountPanelFeedback spellId={mount.id} mountName={mount.name} />
                <FarmResultCardBody mount={mount} mode={mode} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Epic I.5 — Farm recommendations: plain **`ol`** under **`LIST_VIRTUALIZE_MIN`** rows;
 * **`useWindowVirtualizer`** + **`measureElement`** at or above threshold (variable-height **`details`**).
 */
export function FarmRecommendationsList({ mounts, mode }: Props) {
  const inner =
    mounts.length < LIST_VIRTUALIZE_MIN ? (
      <FarmRecommendationsListPlain mounts={mounts} mode={mode} />
    ) : (
      <FarmRecommendationsListWindowed mounts={mounts} mode={mode} />
    );
  return <MountCommunityProvider mounts={mounts}>{inner}</MountCommunityProvider>;
}
