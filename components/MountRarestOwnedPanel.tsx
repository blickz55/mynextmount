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
            Nice — you kept <strong>{mount.name}</strong> even though we list it
            as <strong>gone from Retail</strong>. True trophy energy.
          </>
        ) : (
          <>
            Nice grab — <strong>{mount.name}</strong> is one of the rarer ones
            you own on our scale.
          </>
        )}
      </p>
      <div className="rarest-owned-panel__score-block">
        <p className="rarest-owned-panel__score-line">
          <span className="rarest-owned-panel__score-label">Rarity band</span>{" "}
          <span
            className="rarest-owned-panel__score-value"
            title={
              Number.isFinite(score)
                ? `Same math as Rarest-first mode on the tool. Raw number: ${score.toFixed(4)}.`
                : "Same math as Rarest-first mode on the tool."
            }
          >
            {band}
          </span>
        </p>
        <p className="rarest-owned-panel__score-hint">
          For bragging only — not an official WoW stat. Hover the band for the
          nerd number.
        </p>
      </div>
      <div className="rarest-owned-panel__flavor-block">
        <p className="rarest-owned-panel__flavor-label">Lore blurb</p>
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
