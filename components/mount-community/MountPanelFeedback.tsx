"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  useMountCommunityContext,
  useMountCommunitySummary,
} from "@/components/mount-community/MountCommunityProvider";
import type { MountCommunitySummary } from "@/types/mountCommunity";

type Props = {
  spellId: number;
  mountName: string;
};

const THANK_YOU_MS = 4500;

/** Client-side mirror of vote toggles so the +n / −n line updates immediately. */
function applyVoteDelta(
  before: MountCommunitySummary,
  value: 1 | -1 | 0,
): MountCommunitySummary {
  const my = before.myVote;
  let up = before.upCount;
  let down = before.downCount;
  let myVote: 1 | -1 | null = my;
  if (value === 0) {
    if (my === 1) {
      up = Math.max(0, up - 1);
      myVote = null;
    } else if (my === -1) {
      down = Math.max(0, down - 1);
      myVote = null;
    }
  } else if (value === 1) {
    if (my === -1) down = Math.max(0, down - 1);
    if (my !== 1) {
      up += 1;
      myVote = 1;
    }
  } else {
    if (my === 1) up = Math.max(0, up - 1);
    if (my !== -1) {
      down += 1;
      myVote = -1;
    }
  }
  return {
    commentCount: before.commentCount,
    upCount: up,
    downCount: down,
    myVote,
  };
}

export function MountPanelFeedback({ spellId, mountName }: Props) {
  const { data: session, status } = useSession();
  const summary = useMountCommunitySummary(spellId);
  const { patchSpell } = useMountCommunityContext();
  const summaryRef = useRef(summary);
  summaryRef.current = summary;
  const [pending, setPending] = useState<"up" | "down" | "clear" | null>(
    null,
  );
  const [showThanks, setShowThanks] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    setShowThanks(false);
    setVoteError(null);
  }, [spellId]);

  useEffect(() => {
    if (!showThanks) return;
    const t = window.setTimeout(() => setShowThanks(false), THANK_YOU_MS);
    return () => window.clearTimeout(t);
  }, [showThanks]);

  const submit = useCallback(
    async (value: 1 | -1 | 0) => {
      if (status !== "authenticated" || !session?.user) {
        return;
      }
      setPending(value === 1 ? "up" : value === -1 ? "down" : "clear");
      setVoteError(null);
      const before = { ...summaryRef.current };
      const optimistic = applyVoteDelta(before, value);
      patchSpell(spellId, optimistic);
      try {
        const res = await fetch(`/api/mounts/${spellId}/vote`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          summary?: {
            commentCount?: number;
            upCount?: number;
            downCount?: number;
            myVote?: 1 | -1 | null;
          };
        };

        type ApiSummary = {
          commentCount?: number;
          upCount?: number;
          downCount?: number;
          myVote?: 1 | -1 | null;
        };
        const mergeSummary = (s: ApiSummary) => {
          patchSpell(spellId, {
            commentCount: Number(s.commentCount) || 0,
            upCount: Number(s.upCount) || 0,
            downCount: Number(s.downCount) || 0,
            myVote:
              s.myVote === 1 || s.myVote === -1 ? s.myVote : null,
          });
        };

        if (res.ok) {
          if (data.summary) {
            mergeSummary(data.summary);
          } else {
            const r2 = await fetch(`/api/mounts/${spellId}/comments`, {
              credentials: "include",
            });
            const d2 = (await r2.json().catch(() => ({}))) as {
              summary?: ApiSummary;
            };
            if (d2.summary) {
              mergeSummary(d2.summary);
            }
          }
          if (value === 1 || value === -1) {
            setShowThanks(true);
          } else {
            setShowThanks(false);
          }
        } else {
          patchSpell(spellId, before);
          setVoteError(
            res.status === 401
              ? data.error ||
                  "Sign in again to rate listings (session may have expired)."
              : data.error || "Could not save vote.",
          );
        }
      } catch {
        patchSpell(spellId, before);
        setVoteError("Network error saving vote.");
      } finally {
        setPending(null);
      }
    },
    [session?.user, spellId, status, patchSpell],
  );

  const onUp = () => {
    if (status !== "authenticated") return;
    if (summary.myVote === 1) {
      void submit(0);
    } else {
      void submit(1);
    }
  };

  const onDown = () => {
    if (status !== "authenticated") return;
    if (summary.myVote === -1) {
      void submit(0);
    } else {
      void submit(-1);
    }
  };

  const busy = pending !== null;

  const up = summary.upCount;
  const down = summary.downCount;

  return (
    <div
      className="mount-panel-feedback"
      role="group"
      aria-label={`Feedback for ${mountName}`}
    >
      <span className="mount-panel-feedback__hint" aria-hidden>
        Rate this listing
      </span>
      <div className="mount-panel-feedback__buttons">
        <button
          type="button"
          className="mount-panel-feedback__btn"
          disabled={busy || status !== "authenticated"}
          aria-pressed={summary.myVote === 1}
          aria-label="This farm listing was helpful"
          title={
            status !== "authenticated"
              ? "Sign in to rate this listing"
              : summary.myVote === 1
                ? "Remove thumbs up"
                : "Thumbs up"
          }
          onClick={onUp}
        >
          <ThumbIcon up />
        </button>
        <button
          type="button"
          className="mount-panel-feedback__btn"
          disabled={busy || status !== "authenticated"}
          aria-pressed={summary.myVote === -1}
          aria-label="This farm listing was not helpful"
          title={
            status !== "authenticated"
              ? "Sign in to rate this listing"
              : summary.myVote === -1
                ? "Remove thumbs down"
                : "Thumbs down"
          }
          onClick={onDown}
        >
          <ThumbIcon up={false} />
        </button>
      </div>
      <p
        className="mount-panel-feedback__score"
        aria-live="polite"
        title="Community thumbs up vs thumbs down on this listing"
      >
        +{up} / -{down}
      </p>
      {showThanks ? (
        <p className="mount-panel-feedback__thanks" aria-live="polite">
          Thank you
        </p>
      ) : null}
      {voteError !== null ? (
        <p
          className="mount-panel-feedback__error"
          role="alert"
          aria-live="polite"
        >
          {voteError}
        </p>
      ) : null}
    </div>
  );
}

function ThumbIcon({ up }: { up: boolean }) {
  return (
    <svg
      className="mount-panel-feedback__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      {up ? (
        <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
      ) : (
        <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
      )}
    </svg>
  );
}
