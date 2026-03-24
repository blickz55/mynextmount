import { wowheadCommentsUrl } from "@/lib/wowheadCommentsUrl";
import type { Mount } from "@/types/mount";

const MAX_LINES = 5;

type Props = {
  mount: Mount;
};

/**
 * Epic D.5 — Summarized community tips (build-time data) + link to full Wowhead comments.
 */
export function WowheadCommentDigest({ mount }: Props) {
  const href = wowheadCommentsUrl(mount);
  const raw = mount.wowheadCommentDigest;
  const lines = Array.isArray(raw)
    ? raw.map((s) => String(s).trim()).filter(Boolean).slice(0, MAX_LINES)
    : [];

  if (!href && lines.length === 0) return null;

  const linkLabel = `Open full Wowhead comments for ${mount.name}`;

  return (
    <div className="comment-digest">
      {lines.length > 0 ? (
        <>
          <p className="comment-digest__heading">Community tips (summarized)</p>
          <ul className="comment-digest__list">
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="comment-digest__fineprint">
            Tips are short, reviewed paraphrases of typical player discussion (often informed by
            top-thread comments), not verbatim Wowhead posts.
            {mount.wowheadCommentDigestAsOf
              ? ` Updated ${mount.wowheadCommentDigestAsOf}.`
              : ""}
          </p>
        </>
      ) : href ? (
        <p className="comment-digest__empty">
          No comment digest in our data yet for this mount.
        </p>
      ) : null}

      {href ? (
        <div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${linkLabel} (opens in new tab)`}
          >
            Open full comments on Wowhead
          </a>
          <span className="comment-digest__suffix"> — raw thread and votes</span>
        </div>
      ) : null}
    </div>
  );
}
