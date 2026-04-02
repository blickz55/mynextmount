import { resolveWowheadCommentsLink } from "@/lib/wowheadCommentsUrl";
import { renderQuickStepLineWithExaltedLinks } from "@/lib/reputationExaltedQuickStep";
import type { Mount } from "@/types/mount";

const MAX_LINES = 5;

type Props = {
  mount: Mount;
};

/**
 * Quick acquisition bullets (and optional flavor) from JSON + Wowhead comments link.
 */
export function WowheadCommentDigest({ mount }: Props) {
  const target = resolveWowheadCommentsLink(mount);
  const flavor = mount.wowheadMountFlavor?.trim();
  const raw = mount.wowheadCommentDigest;
  const lines = Array.isArray(raw)
    ? raw.map((s) => String(s).trim()).filter(Boolean).slice(0, MAX_LINES)
    : [];

  const hasCopy = Boolean(flavor) || lines.length > 0;
  const retired = mount.retailObtainable === false;
  if (!retired && !target && !hasCopy) return null;

  const linkLabel =
    target?.pageKind === "item"
      ? `Wowhead item comments — ${mount.name}`
      : `Wowhead spell comments — ${mount.name}`;

  const linkExplanation =
    target?.pageKind === "item"
      ? "Opens the item page straight to player comments (journal “teach” item)."
      : "Opens the spell page to comments — we use item links when we have them.";

  return (
    <div className="comment-digest">
      {retired ? (
        <p className="comment-digest__unobtainable-banner" role="status">
          <strong>Gone from Retail on our list.</strong> Tips and Wowhead links are for history
          — don’t farm this expecting it to drop in live Retail.
        </p>
      ) : null}
      {hasCopy ? (
        <>
          <p className="comment-digest__heading">
            {flavor ? "The vibe" : "Quick steps"}
          </p>
          {flavor ? (
            <p className="comment-digest__flavor">
              {renderQuickStepLineWithExaltedLinks(flavor)}
            </p>
          ) : null}
          {lines.length > 0 ? (
            <ul className="comment-digest__list">
              {lines.map((line, i) => (
                <li key={i}>{renderQuickStepLineWithExaltedLinks(line)}</li>
              ))}
            </ul>
          ) : null}
          <p className="comment-digest__fineprint">
            {retired
              ? "Old sources may be dead or time-gated — treat as museum text and verify on Wowhead."
              : "Drafted from our notes (AI or hand-edited). Double-check in game; patches move vendors and drop tables."}
            {mount.wowheadCommentDigestAsOf
              ? ` Updated ${mount.wowheadCommentDigestAsOf}.`
              : ""}
          </p>
        </>
      ) : target ? (
        <p className="comment-digest__empty">
          {retired
            ? "No write-up here — hit Wowhead for old war stories."
            : "No write-up here yet."}
        </p>
      ) : retired ? (
        <p className="comment-digest__empty">
          No Wowhead link on file for this one.
        </p>
      ) : null}

      {target ? (
        <div>
          <a
            href={target.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${linkLabel} (opens in new tab)`}
          >
            {target.pageKind === "item"
              ? "Wowhead — item comments"
              : "Wowhead — spell comments"}
          </a>
          <span className="comment-digest__suffix"> — {linkExplanation}</span>
        </div>
      ) : null}
    </div>
  );
}
