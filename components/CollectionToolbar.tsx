"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

type Props = {
  parsedIds: number[] | null;
  onApplyParsedIds: (ids: number[]) => void;
};

export function CollectionToolbar({ parsedIds, onApplyParsedIds }: Props) {
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
        and reload it on another device.
      </p>
    );
  }

  return (
    <div className="collection-toolbar">
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
        <button
          type="button"
          className="btn-secondary"
          disabled={pending !== null}
          onClick={load}
        >
          {pending === "load" ? "Loading…" : "Load saved collection"}
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
