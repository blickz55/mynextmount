import { scoreRarest } from "@/lib/scoreRarest";
import type { Mount } from "@/types/mount";

type Props = { mount: Mount };

/**
 * "Your rarest mounts" showcase: congrats + numeric rarest score + mined flavor (wowheadMountFlavor).
 */
export function MountRarestOwnedPanel({ mount }: Props) {
  const score = scoreRarest(mount);
  const flavor = mount.wowheadMountFlavor?.trim();
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
            title="Same composite as “rarest” mode elsewhere on the tool (drop weight, difficulty, rare tags)."
          >
            {Number.isFinite(score) ? score.toFixed(2) : "—"}
          </span>
        </p>
        <p className="rarest-owned-panel__score-hint">
          Higher = rarer / harder on this site&apos;s formula (for fun, not an
          official WoW stat).
        </p>
      </div>
      <div className="rarest-owned-panel__flavor-block">
        <p className="rarest-owned-panel__flavor-label">Spotlight</p>
        {flavor ? (
          <p className="rarest-owned-panel__flavor-text">{flavor}</p>
        ) : (
          <p className="rarest-owned-panel__flavor-missing">
            No mined spotlight blurb for this mount yet (we add these from our
            data pipeline over time).
          </p>
        )}
      </div>
    </div>
  );
}
