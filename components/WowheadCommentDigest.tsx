import { resolveWowheadCommentsLink } from "@/lib/wowheadCommentsUrl";
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
  if (!target && !hasCopy) return null;

  const linkLabel =
    target?.pageKind === "item"
      ? `Wowhead item page, comments tab — ${mount.name}`
      : `Wowhead spell page, comments tab — ${mount.name}`;

  const linkExplanation =
    target?.pageKind === "item"
      ? "We open the item page (the journal “teach item” context) on the comments section."
      : "Spell page is shown until you map a Wowhead item id in data/overrides/wowhead-item-by-spell.json.";

  return (
    <div className="comment-digest">
      {hasCopy ? (
        <>
          <p className="comment-digest__heading">
            {flavor ? "Mount spotlight" : "Quick steps"}
          </p>
          {flavor ? (
            <p className="comment-digest__flavor">{flavor}</p>
          ) : null}
          {lines.length > 0 ? (
            <ul className="comment-digest__list">
              {lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : null}
          <p className="comment-digest__fineprint">
            Steps are generated with OpenAI from our mount metadata (or edited by hand). Verify
            in-game; drops and vendors change with patches.
            {mount.wowheadCommentDigestAsOf
              ? ` Updated ${mount.wowheadCommentDigestAsOf}.`
              : ""}
          </p>
        </>
      ) : target ? (
        <p className="comment-digest__empty">
          No spotlight copy in our data yet for this mount.
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
              ? "Open Wowhead (item → comments)"
              : "Open Wowhead (spell → comments)"}
          </a>
          <span className="comment-digest__suffix"> — {linkExplanation}</span>
        </div>
      ) : null}
    </div>
  );
}
