"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useRef, useState } from "react";

import {
  useMountCommunityContext,
  useMountCommunitySummary,
} from "@/components/mount-community/MountCommunityProvider";
import { MOUNT_COMMENT_MAX_LENGTH } from "@/lib/mountCommunityConstants";
import type { MountCommunitySummary } from "@/types/mountCommunity";

type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  isYou: boolean;
};

type Props = {
  spellId: number;
  mountName: string;
};

function formatAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const sec = Math.round((Date.now() - t) / 1000);
  if (!Number.isFinite(sec) || sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function MountCommunitySection({ spellId, mountName }: Props) {
  const { status } = useSession();
  const summary = useMountCommunitySummary(spellId);
  const { patchSpell, mergeSummaries } = useMountCommunityContext();
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const [postMsg, setPostMsg] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadThread = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/mounts/${spellId}/comments`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        comments?: CommentRow[];
        summary?: MountCommunitySummary;
      };
      if (!res.ok) {
        setLoadError(data.error || "Could not load discussion.");
        return;
      }
      setComments(Array.isArray(data.comments) ? data.comments : []);
      if (data.summary) {
        mergeSummaries({
          [spellId]: {
            commentCount: Number(data.summary.commentCount) || 0,
            upCount: Number(data.summary.upCount) || 0,
            downCount: Number(data.summary.downCount) || 0,
            myVote:
              data.summary.myVote === 1 || data.summary.myVote === -1
                ? data.summary.myVote
                : null,
          },
        });
      }
      loadedRef.current = true;
    } catch {
      setLoadError("Network error loading discussion.");
    }
  }, [spellId, mergeSummaries]);


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "authenticated") return;
    const body = draft.trim();
    if (body.length < 1) return;
    setPostMsg(null);
    setPosting(true);
    try {
      const res = await fetch(`/api/mounts/${spellId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        comment?: CommentRow;
        summary?: MountCommunitySummary;
      };
      if (!res.ok) {
        setPostMsg(data.error || "Could not post.");
        return;
      }
      if (data.comment) {
        setComments((prev) => [data.comment!, ...(prev ?? [])]);
      }
      if (data.summary) {
        patchSpell(spellId, {
          commentCount: Number(data.summary.commentCount) || 0,
        });
      }
      setDraft("");
    } catch {
      setPostMsg("Network error.");
    } finally {
      setPosting(false);
    }
  };

  const countLabel =
    summary.commentCount === 0
      ? "No comments yet"
      : `${summary.commentCount} comment${summary.commentCount === 1 ? "" : "s"}`;

  return (
    <details
      className="mount-community"
      onToggle={(e) => {
        const el = e.currentTarget;
        if (el.open && !loadedRef.current) {
          void loadThread();
        }
      }}
    >
      <summary className="mount-community__summary">
        <span className="mount-community__summary-main">
          <span className="mount-community__title">Community</span>
          <span
            className={
              summary.commentCount > 0
                ? "mount-community__badge mount-community__badge--active"
                : "mount-community__badge"
            }
            title={countLabel}
          >
            {summary.commentCount > 0 ? summary.commentCount : "—"}
          </span>
        </span>
        <span className="mount-community__cta">
          {status === "authenticated"
            ? "Click to discuss · add a tip or correction"
            : "Click to read · sign in to add a comment"}
        </span>
      </summary>
      <div className="mount-community__panel">
        <p className="mount-community__intro">
          <span className="sr-only">{mountName}: </span>
          Player notes for this farm target. Be constructive; this is not
          official Blizzard support.
        </p>
        {loadError !== null && (
          <p className="mount-community__error" role="alert">
            {loadError}{" "}
            <button
              type="button"
              className="mount-community__retry"
              onClick={() => {
                loadedRef.current = false;
                void loadThread();
              }}
            >
              Retry
            </button>
          </p>
        )}
        <ul className="mount-community__thread" aria-label="Comments">
          {(comments ?? []).map((c) => (
            <li key={c.id} className="mount-community__msg">
              <div className="mount-community__msg-meta">
                <span className="mount-community__msg-author">
                  {c.isYou ? "You" : "Member"}
                </span>
                <time dateTime={c.createdAt}>{formatAgo(c.createdAt)}</time>
              </div>
              <p className="mount-community__msg-body">{c.body}</p>
            </li>
          ))}
        </ul>
        {comments !== null && comments.length === 0 && !loadError && (
          <p className="mount-community__empty">No comments yet.</p>
        )}
        {status === "authenticated" ? (
          <form className="mount-community__form" onSubmit={onSubmit}>
            <label htmlFor={`mc-${spellId}`} className="mount-community__label">
              Add a comment
            </label>
            <textarea
              id={`mc-${spellId}`}
              className="mount-community__textarea"
              rows={3}
              maxLength={MOUNT_COMMENT_MAX_LENGTH}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tip, warning, or better route — keep it respectful."
              disabled={posting}
            />
            <div className="mount-community__form-actions">
              <span className="mount-community__counter">
                {draft.length}/{MOUNT_COMMENT_MAX_LENGTH}
              </span>
              <button
                type="submit"
                className="btn-secondary mount-community__submit"
                disabled={posting || draft.trim().length < 1}
              >
                {posting ? "Posting…" : "Post comment"}
              </button>
            </div>
            {postMsg !== null && (
              <p className="mount-community__error" role="status">
                {postMsg}
              </p>
            )}
          </form>
        ) : (
          <p className="mount-community__signin">
            <Link href="/login?callbackUrl=/tool">Sign in</Link> to join the
            discussion.
          </p>
        )}
      </div>
    </details>
  );
}
