"use client";

import { LoreMarkdown } from "@/components/MountLoreRelicTooltip";
import {
  OWNED_MOUNT_NO_LORE_YET_MSG,
  resolveOwnedMountLoreText,
} from "@/lib/resolveOwnedMountLoreText";
import { recommendationScoreToAcquisitionBandLabel } from "@/lib/scoring";
import { scoreRarest } from "@/lib/scoreRarest";
import type { Mount } from "@/types/mount";

type Props = { mount: Mount };

/**
 * "Your rarest mounts" showcase: congrats + rarest score + same lore as View Your Mounts hover
 * (`mountHoverLore` then `wowheadMountFlavor`), rendered as Markdown when applicable.
 */
export function MountRarestOwnedPanel({ mount }: Props) {
  const score = scoreRarest(mount);
  const band = recommendationScoreToAcquisitionBandLabel(score, true);
  const loreText = resolveOwnedMountLoreText(mount);
  const retired = mount.retailObtainable === false;

  return (
    <div className="rarest-owned-panel">
      <p className="rarest-owned-panel__congrats">
        {retired ? (
          <>
            Congratulations — you carry <strong>{mount.name}</strong> in your
            collection even though it&apos;s{" "}
            <strong>no longer obtainable on Retail</strong>. That&apos;s a real
            trophy slot.
          </>
        ) : (
          <>
            Congratulations on earning <strong>{mount.name}</strong> — it ranks
            among the rarest mounts you own here by our &quot;rarest&quot; formula.
          </>
        )}
      </p>
      <div className="rarest-owned-panel__score-block">
        <p className="rarest-owned-panel__score-line">
          <span className="rarest-owned-panel__score-label">Rarity score</span>{" "}
          <span
            className="rarest-owned-panel__score-value"
            title={
              Number.isFinite(score)
                ? `Same composite as “rarest” mode elsewhere on the tool (drop weight, difficulty, rare tags). Numeric score: ${score.toFixed(4)}.`
                : "Same composite as “rarest” mode elsewhere on the tool (drop weight, difficulty, rare tags)."
            }
          >
            {band}
          </span>
        </p>
        <p className="rarest-owned-panel__score-hint">
          Band is from this site&apos;s “rarest” formula (for fun, not an
          official WoW stat). Hover the value for the underlying number.
        </p>
      </div>
      <div className="rarest-owned-panel__flavor-block">
        <p className="rarest-owned-panel__flavor-label">Flavor</p>
        {loreText ? (
          <div className="rarest-owned-panel__lore">
            <LoreMarkdown text={loreText} />
          </div>
        ) : (
          <p className="rarest-owned-panel__flavor-missing">
            {OWNED_MOUNT_NO_LORE_YET_MSG}
          </p>
        )}
      </div>
    </div>
  );
}
