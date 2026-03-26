"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { MountIcon } from "@/components/MountIcon";
import { MountFarmSecondaryDetails } from "@/components/MountRowSecondaryDetails";
import { buildRecommendationReason } from "@/lib/buildRecommendationReason";
import { getMountLocationLabel } from "@/lib/getMountLocationLabel";
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
  return (
    <>
      <div className="mount-result-card__head">
        <MountIcon mount={mount} />
        <strong>{mount.name}</strong>
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
      <MountFarmSecondaryDetails mount={mount} />
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
        <li key={mount.id} className="mount-result-card">
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
                className="mount-result-card"
                data-farm-rank={vRow.index + 1}
              >
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
  if (mounts.length < LIST_VIRTUALIZE_MIN) {
    return <FarmRecommendationsListPlain mounts={mounts} mode={mode} />;
  }
  return <FarmRecommendationsListWindowed mounts={mounts} mode={mode} />;
}
