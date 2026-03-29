"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

import type { SourceBucketId } from "@/lib/mountSourceBucket";
import type { RecommendationMode } from "@/types/recommendationMode";

/** Sent with Save so server can match the same top-N farm list as the tool (Epic K.2). */
export type CollectionSaveContext = {
  recommendationMode: RecommendationMode;
  sourceFilters: Record<SourceBucketId, boolean>;
  farmSearchQuery: string;
};

type Props = {
  parsedIds: number[] | null;
  onApplyParsedIds: (ids: number[]) => void;
  /** From GET /api/collection; null while unknown (e.g. session loading). */
  remoteSavedCount: number | null;
  /** True after the tool page finished its first account collection fetch this visit. */
  accountFetchSettled: boolean;
  /** Anchor id to scroll to when the user already has the grid on screen. */
  collectionAnchorId?: string;
  /** When set, included in PUT /api/collection for farm attempt increments (K.2). */
  saveContext?: CollectionSaveContext | null;
};

function withFarmAttemptNote(
  base: string,
  count: number,
  farmAttempts?: { skippedIncrement?: boolean; spellIdsBumped?: number },
): string {
  if (count <= 0) return base;
  const bumped = farmAttempts?.spellIdsBumped ?? 0;
  if (farmAttempts?.skippedIncrement && bumped === 0) {
    return `${base} Farm attempt counts for your top suggestions were unchanged (duplicate snapshot or rapid re-save).`;
  }
  if (bumped > 0) {
    return `${base} Logged a farm try for ${bumped} top suggestion${bumped === 1 ? "" : "s"}.`;
  }
  return base;
}

export function CollectionToolbar({
  parsedIds,
  onApplyParsedIds,
  remoteSavedCount,
  accountFetchSettled,
  collectionAnchorId = "mnm-collection-anchor",
  saveContext = null,
}: Props) {
  const { status } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [gainHighlight, setGainHighlight] = useState<
    { spellId: number; name: string }[] | null
  >(null);
  const [pending, setPending] = useState<"save" | "load" | null>(null);

  const save = useCallback(async () => {
    if (!parsedIds || parsedIds.length === 0) return;
    setMessage(null);
    setGainHighlight(null);
    setPending("save");
    try {
      const payload: Record<string, unknown> = { spellIds: parsedIds };
      if (saveContext) {
        payload.recommendationMode = saveContext.recommendationMode;
        payload.sourceFilters = saveContext.sourceFilters;
        payload.farmSearchQuery = saveContext.farmSearchQuery;
      }
      const res = await fetch("/api/collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let data: {
        error?: string;
        count?: number;
        snapshot?: {
          duplicateSkipped?: boolean;
          diff?: {
            added: { spellId: number; name: string }[];
            removed: { spellId: number; name: string }[];
          };
        } | null;
        farmAttempts?: { skippedIncrement?: boolean; spellIdsBumped?: number };
      } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        /* non-JSON error body */
      }
      if (!res.ok) {
        setMessage(
          data.error?.trim() ||
            `Save failed (HTTP ${res.status}). Try again or sign out and back in.`,
        );
        return;
      }
      const count = data.count ?? parsedIds.length;
      if (data.snapshot === null && count === 0) {
        setMessage("Cleared your saved collection on this account.");
        return;
      }
      if (data.snapshot?.duplicateSkipped) {
        setMessage(
          withFarmAttemptNote(
            `Saved ${count} spell IDs — same as your last snapshot, so we did not add a duplicate history row.`,
            count,
            data.farmAttempts,
          ),
        );
        return;
      }
      const diff = data.snapshot?.diff;
      if (diff) {
        const na = diff.added?.length ?? 0;
        const nr = diff.removed?.length ?? 0;
        if (na > 0) {
          setGainHighlight(
            diff.added!.map((x) => ({
              spellId: x.spellId,
              name: x.name,
            })),
          );
        } else {
          setGainHighlight(null);
        }
        const parts: string[] = [`Saved ${count} spell IDs to your account.`];
        if (na === 0 && nr === 0) {
          parts.push(
            "First collection snapshot stored — next time you change the list, we’ll show what was added or removed.",
          );
        } else {
          if (na > 0) {
            parts.push(
              `You gained ${na} mount${na === 1 ? "" : "s"} since your last snapshot — see the list below.`,
            );
          }
          if (nr > 0) {
            parts.push(
              `Removed ${nr} mount${nr === 1 ? "" : "s"} vs your previous snapshot.`,
            );
          }
        }
        setMessage(
          withFarmAttemptNote(parts.join(" "), count, data.farmAttempts),
        );
        return;
      }
      setMessage(
        withFarmAttemptNote(
          `Saved ${count} spell IDs to your account.`,
          count,
          data.farmAttempts,
        ),
      );
    } catch {
      setMessage("Network error while saving.");
    } finally {
      setPending(null);
    }
  }, [parsedIds, saveContext]);

  const load = useCallback(async () => {
    setMessage(null);
    setGainHighlight(null);
    setPending("load");
    try {
      const res = await fetch("/api/collection");
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        spellIds?: number[];
      };
      if (!res.ok) {
        setMessage(data.error || "Could not load saved collection.");
        return;
      }
      const ids = Array.isArray(data.spellIds) ? data.spellIds : [];
      if (ids.length === 0) {
        setMessage("No saved collection yet — paste an export and click Save.");
        return;
      }
      onApplyParsedIds(ids);
      setMessage(`Loaded ${ids.length} spell IDs from your account.`);
    } catch {
      setMessage("Network error while loading.");
    } finally {
      setPending(null);
    }
  }, [onApplyParsedIds]);

  const scrollToCollection = useCallback(() => {
    const el =
      typeof document !== "undefined"
        ? document.getElementById(collectionAnchorId)
        : null;
    if (el) {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      return;
    }
    setMessage("Your collection appears below once spell IDs are on screen.");
  }, [collectionAnchorId]);

  if (status === "loading") {
    return (
      <p className="collection-toolbar collection-toolbar--muted" aria-hidden>
        …
      </p>
    );
  }

  if (status !== "authenticated") {
    return (
      <p className="collection-toolbar collection-toolbar--guest">
        <Link href="/login">Sign in</Link> to save your export to your account
        and reload it on another device. After you save once, we can pull your
        collection automatically the next time you open this page.
      </p>
    );
  }

  const hasRemote = (remoteSavedCount ?? 0) > 0;
  const showingCollection =
    parsedIds !== null && parsedIds.length > 0;
  const loadLabel =
    hasRemote && showingCollection ? "Sync from account" : "Load saved collection";

  return (
    <div className="collection-toolbar">
      <p className="collection-toolbar__signed-in-hint">
        Signed in — use <strong>Save to my account</strong> after pasting an
        export, or open{" "}
        <Link href="/account" className="collection-toolbar__account-link">
          My Mounts
        </Link>{" "}
        for stats and weekly ideas, or{" "}
        <Link href="/account/settings" className="collection-toolbar__account-link">
          settings
        </Link>{" "}
        for lockout timing and account data.
      </p>
      <div className="collection-toolbar__actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={
            pending !== null || parsedIds === null || parsedIds.length === 0
          }
          onClick={save}
        >
          {pending === "save" ? "Saving…" : "Save to my account"}
        </button>
        {hasRemote && accountFetchSettled && showingCollection ? (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending !== null}
            onClick={scrollToCollection}
          >
            View my collection
          </button>
        ) : null}
        <button
          type="button"
          className="btn-secondary"
          disabled={
            pending !== null ||
            !accountFetchSettled ||
            remoteSavedCount === null
          }
          onClick={load}
        >
          {pending === "load"
            ? "Loading…"
            : remoteSavedCount === null
              ? "Checking account…"
              : loadLabel}
        </button>
      </div>
      {message !== null && (
        <p className="collection-toolbar__msg" role="status">
          {message}
        </p>
      )}
      {gainHighlight !== null && gainHighlight.length > 0 ? (
        <div
          className="collection-toolbar__gains"
          role="region"
          aria-label="Mounts gained since last snapshot"
        >
          <p className="collection-toolbar__gains-title">
            <strong>New since last snapshot</strong>
          </p>
          <ul className="collection-toolbar__gains-list">
            {gainHighlight.slice(0, 12).map((row) => (
              <li key={row.spellId}>{row.name}</li>
            ))}
          </ul>
          {gainHighlight.length > 12 ? (
            <p className="collection-toolbar__gains-more field-hint">
              …and {gainHighlight.length - 12} more.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
