"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { MountCommunityHeadBadge } from "@/components/mount-community/MountCommunityHeadBadge";
import { MountCommunityProvider } from "@/components/mount-community/MountCommunityProvider";
import { MountCommunitySection } from "@/components/mount-community/MountCommunitySection";
import { MountPanelFeedback } from "@/components/mount-community/MountPanelFeedback";
import { MountIcon } from "@/components/MountIcon";
import { MountFarmSecondaryDetails } from "@/components/MountRowSecondaryDetails";
import { buildRecommendationReason } from "@/lib/buildRecommendationReason";
import { formatUnlockInShort } from "@/lib/formatLockoutCountdown";
import { getMountLocationLabel } from "@/lib/getMountLocationLabel";
import { recordFarmScoreEngagement } from "@/lib/farmPreferenceStorage";
import {
  recommendationScoreToAcquisitionBandLabel,
  scoreForRecommendationMode,
  type ScoringContext,
} from "@/lib/scoring";
import { LIST_VIRTUALIZE_MIN } from "@/lib/virtualizeThresholds";
import type { Mount } from "@/types/mount";
import type { RecommendationMode } from "@/types/recommendationMode";

/** Epic K.3 — lockout row state from `POST /api/collection/farm-attempts`. */
export type FarmLockoutRowStats = {
  kind: "none" | "daily" | "weekly";
  state: "available" | "locked";
  unlocksAt: string | null;
};

/** Epic K.2 / K.3 — row stats from `POST /api/collection/farm-attempts`. */
export type FarmAttemptRowStats = {
  attempts: number;
  lastAttemptAt: string | null;
  pSeenDropPct: number | null;
  lockout: FarmLockoutRowStats;
};

/** Collapsed-row guess; `measureElement` corrects when rows expand (details open). */
const FARM_ROW_ESTIMATE_PX = 140;

const FARM_ATTEMPT_TOOLTIP =
  "How often you hit Save while this mount sat in your top picks (same mode, checkboxes, and search you’re using now). The % is a rough “you might’ve seen a drop by now” guess from our listed drop rate — don’t bet gold on it.";

const LOCKOUT_TOOLTIP =
  "Daily: wait ~24h after a save that counted this mount. Weekly: follows your region’s reset (set it under My Mounts). Countdown uses your PC clock.";

function FarmResultCardBody({
  mount,
  mode,
  farmAttempt,
  scoringContext,
}: {
  mount: Mount;
  mode: RecommendationMode;
  farmAttempt: FarmAttemptRowStats;
  scoringContext?: ScoringContext;
}) {
  const scored = scoreForRecommendationMode(mount, mode, scoringContext);
  const scoreBand = recommendationScoreToAcquisitionBandLabel(
    scored.score,
    mode === "rarest",
  );
  const attempts = farmAttempt.attempts;
  const pSeen = farmAttempt.pSeenDropPct;
  const lock = farmAttempt.lockout;
  const unlockDate =
    lock.unlocksAt !== null ? new Date(lock.unlocksAt) : null;
  return (
    <>
      <div className="mount-result-card__head">
        <MountIcon mount={mount} />
        <strong>{mount.name}</strong>
        {mount.retailObtainable === false ? (
          <span className="mount-result-card__unobtainable">
            Gone in Retail (our list)
          </span>
        ) : null}
        <MountCommunityHeadBadge spellId={mount.id} />
      </div>
      <div className="mount-result-card__line">
        Where: {getMountLocationLabel(mount)}
      </div>
      {mount.boss !== undefined && mount.boss !== "" && (
        <div className="mount-result-card__line">Boss: {mount.boss}</div>
      )}
      <div className="mount-result-card__line">
        Why it’s here: {buildRecommendationReason(mount, mode)}
      </div>
      <div
        className="mount-result-card__line mount-result-card__farm-attempts"
        title={FARM_ATTEMPT_TOOLTIP}
      >
        <span className="mount-result-card__farm-attempts__label">
          Farm tries: <strong>{attempts}</strong>
        </span>
        {pSeen !== null ? (
          <span className="mount-result-card__farm-attempts__est">
            Rough drop-seen guess: {pSeen}%
          </span>
        ) : null}
      </div>
      {lock.kind !== "none" ? (
        <div
          className="mount-result-card__line mount-result-card__lockout"
          title={LOCKOUT_TOOLTIP}
        >
          {lock.state === "available" ? (
            <>
              Timer: <strong>Ready</strong>
              <span className="mount-result-card__lockout__kind">
                {" "}
                ({lock.kind})
              </span>
            </>
          ) : (
            <>
              Timer: <strong>On cooldown</strong>
              {unlockDate !== null && !Number.isNaN(unlockDate.getTime()) ? (
                <>
                  {" "}
                  — try again in{" "}
                  <span className="mount-result-card__lockout__countdown">
                    {formatUnlockInShort(unlockDate)}
                  </span>{" "}
                  <span className="mount-result-card__lockout__local">
                    (
                    {unlockDate.toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    )
                  </span>
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <details
        className="mount-result-card__scoring mount-result-card__fold"
        onToggle={(e) => {
          const el = e.currentTarget;
          if (el.open) {
            recordFarmScoreEngagement(
              mount.id,
              Math.max(1, mount.timeToComplete),
            );
          }
        }}
      >
        <summary
          title={
            Number.isFinite(scored.score)
              ? `Exact score: ${scored.score.toFixed(4)}`
              : undefined
          }
        >
          Score ({scoreBand})
        </summary>
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
  /** Per spell ID; missing keys show as 0 tries (guest or not yet loaded). */
  farmAttemptsBySpellId?: Readonly<Record<number, FarmAttemptRowStats>> | null;
  /** Epic K.4 — when set (signed-in + farm data loaded), card score matches list sort. */
  scoringContext?: ScoringContext;
};

const ZERO_LOCKOUT: FarmLockoutRowStats = {
  kind: "none",
  state: "available",
  unlocksAt: null,
};

const ZERO_ATTEMPT: FarmAttemptRowStats = {
  attempts: 0,
  lastAttemptAt: null,
  pSeenDropPct: null,
  lockout: ZERO_LOCKOUT,
};

function rowStats(
  map: Readonly<Record<number, FarmAttemptRowStats>> | null | undefined,
  spellId: number,
): FarmAttemptRowStats {
  const row = map?.[spellId];
  if (!row) return ZERO_ATTEMPT;
  return {
    attempts: row.attempts,
    lastAttemptAt: row.lastAttemptAt,
    pSeenDropPct: row.pSeenDropPct,
    lockout: row.lockout ?? ZERO_LOCKOUT,
  };
}

function FarmRecommendationsListPlain({
  mounts,
  mode,
  farmAttemptsBySpellId,
  scoringContext,
}: Props) {
  return (
    <ol className="mount-results-list">
      {mounts.map((mount) => (
        <li key={mount.id} className="mount-result-card mount-result-card--community">
          <MountPanelFeedback spellId={mount.id} mountName={mount.name} />
          <FarmResultCardBody
            mount={mount}
            mode={mode}
            farmAttempt={rowStats(farmAttemptsBySpellId, mount.id)}
            scoringContext={scoringContext}
          />
        </li>
      ))}
    </ol>
  );
}

function FarmRecommendationsListWindowed({
  mounts,
  mode,
  farmAttemptsBySpellId,
  scoringContext,
}: Props) {
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
      aria-label="Suggested mounts to farm"
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
                <FarmResultCardBody
                  mount={mount}
                  mode={mode}
                  farmAttempt={rowStats(farmAttemptsBySpellId, mount.id)}
                  scoringContext={scoringContext}
                />
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
export function FarmRecommendationsList({
  mounts,
  mode,
  farmAttemptsBySpellId = null,
  scoringContext,
}: Props) {
  const inner =
    mounts.length < LIST_VIRTUALIZE_MIN ? (
      <FarmRecommendationsListPlain
        mounts={mounts}
        mode={mode}
        farmAttemptsBySpellId={farmAttemptsBySpellId}
        scoringContext={scoringContext}
      />
    ) : (
      <FarmRecommendationsListWindowed
        mounts={mounts}
        mode={mode}
        farmAttemptsBySpellId={farmAttemptsBySpellId}
        scoringContext={scoringContext}
      />
    );
  return <MountCommunityProvider mounts={mounts}>{inner}</MountCommunityProvider>;
}
