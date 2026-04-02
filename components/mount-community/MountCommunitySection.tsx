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
  updatedAt: string;
  isYou: boolean;
};

function commentLooksEdited(c: Pick<CommentRow, "createdAt" | "updatedAt">) {
  return (
    new Date(c.updatedAt).getTime() >
    new Date(c.createdAt).getTime() + 750
  );
}

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadThread = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/mounts/${spellId}/comments`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        comments?: CommentRow[];
        summary?: MountCommunitySummary;
      };
      if (!res.ok) {
        setLoadError(data.error || "Could not load discussion.");
        return;
      }
      setComments(
        (Array.isArray(data.comments) ? data.comments : []).map((c) => ({
          ...c,
          updatedAt:
            typeof (c as CommentRow).updatedAt === "string"
              ? (c as CommentRow).updatedAt
              : (c as CommentRow).createdAt,
        })),
      );
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        comment?: CommentRow;
        summary?: MountCommunitySummary;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setPostMsg(
            data.error ||
              "Session expired or not signed in. Refresh the page and sign in again.",
          );
        } else {
          setPostMsg(data.error || "Could not save comment.");
        }
        return;
      }
      if (data.comment) {
        const com = {
          ...data.comment,
          updatedAt: data.comment.updatedAt ?? data.comment.createdAt,
        };
        setComments((prev) => [com, ...(prev ?? [])]);
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

  const startEdit = (c: CommentRow) => {
    setEditMsg(null);
    setEditingId(c.id);
    setEditDraft(c.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
    setEditMsg(null);
  };

  const saveEdit = async () => {
    if (editingId === null || status !== "authenticated") return;
    const body = editDraft.trim();
    if (body.length < 1) return;
    setEditMsg(null);
    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/mounts/${spellId}/comments/${encodeURIComponent(editingId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        comment?: CommentRow;
      };
      if (!res.ok) {
        setEditMsg(
          res.status === 401
            ? data.error || "Session expired. Refresh and sign in again."
            : data.error || "Could not update comment.",
        );
        return;
      }
      if (data.comment) {
        setComments((prev) =>
          (prev ?? []).map((x) =>
            x.id === data.comment!.id ? { ...data.comment! } : x,
          ),
        );
      }
      cancelEdit();
    } catch {
      setEditMsg("Network error.");
    } finally {
      setEditSaving(false);
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
          <span className="mount-community__title-line">
            <span className="mount-community__title">Community</span>
            <span
              className="mount-community__toggle-icon"
              aria-hidden
              title="Expand or collapse"
            />
          </span>
          <span
            className={
              summary.commentCount > 0
                ? "mount-community__badge mount-community__badge--active"
                : "mount-community__badge"
            }
            title={countLabel}
          >
            {summary.commentCount}
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
          {status !== "authenticated" ? (
            <>
              {" "}
              <strong>Sign in</strong> to post or edit comments.
            </>
          ) : null}
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
                {commentLooksEdited(c) ? (
                  <span className="mount-community__msg-edited">Edited</span>
                ) : null}
                {c.isYou && status === "authenticated" && editingId !== c.id ? (
                  <button
                    type="button"
                    className="mount-community__edit-link"
                    onClick={() => startEdit(c)}
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              {editingId === c.id ? (
                <div className="mount-community__edit-box">
                  <textarea
                    className="mount-community__textarea mount-community__textarea--edit"
                    rows={3}
                    maxLength={MOUNT_COMMENT_MAX_LENGTH}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    disabled={editSaving}
                    aria-label="Edit comment"
                  />
                  <div className="mount-community__edit-actions">
                    <span className="mount-community__counter">
                      {editDraft.length}/{MOUNT_COMMENT_MAX_LENGTH}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={editSaving}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={
                        editSaving || editDraft.trim().length < 1
                      }
                      onClick={() => void saveEdit()}
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                  {editMsg !== null ? (
                    <p className="mount-community__error" role="status">
                      {editMsg}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mount-community__msg-body">{c.body}</p>
              )}
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
