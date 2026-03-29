"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

type Props = {
  parsedIds: number[] | null;
  onApplyParsedIds: (ids: number[]) => void;
  /** From GET /api/collection; null while unknown (e.g. session loading). */
  remoteSavedCount: number | null;
  /** True after the tool page finished its first account collection fetch this visit. */
  accountFetchSettled: boolean;
  /** Anchor id to scroll to when the user already has the grid on screen. */
  collectionAnchorId?: string;
};

export function CollectionToolbar({
  parsedIds,
  onApplyParsedIds,
  remoteSavedCount,
  accountFetchSettled,
  collectionAnchorId = "mnm-collection-anchor",
}: Props) {
  const { status } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "load" | null>(null);

  const save = useCallback(async () => {
    if (!parsedIds || parsedIds.length === 0) return;
    setMessage(null);
    setPending("save");
    try {
      const res = await fetch("/api/collection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spellIds: parsedIds }),
      });
      const raw = await res.text();
      let data: { error?: string; count?: number } = {};
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
      setMessage(`Saved ${data.count ?? parsedIds.length} spell IDs to your account.`);
    } catch {
      setMessage("Network error while saving.");
    } finally {
      setPending(null);
    }
  }, [parsedIds]);

  const load = useCallback(async () => {
    setMessage(null);
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
        for stats and weekly farm ideas.
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
    </div>
  );
}
