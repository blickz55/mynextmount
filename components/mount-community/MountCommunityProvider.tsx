"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Mount } from "@/types/mount";
import type { MountCommunitySummary } from "@/types/mountCommunity";

function emptySummary(): MountCommunitySummary {
  return {
    commentCount: 0,
    upCount: 0,
    downCount: 0,
    myVote: null,
  };
}

type Ctx = {
  summaries: Record<number, MountCommunitySummary>;
  loading: boolean;
  patchSpell: (spellId: number, partial: Partial<MountCommunitySummary>) => void;
  mergeSummaries: (map: Record<number, MountCommunitySummary>) => void;
};

const MountCommunityContext = createContext<Ctx | null>(null);

export function useMountCommunityContext(): Ctx {
  const c = useContext(MountCommunityContext);
  if (!c) {
    throw new Error("useMountCommunityContext outside MountCommunityProvider");
  }
  return c;
}

export function useMountCommunitySummary(
  spellId: number,
): MountCommunitySummary {
  const { summaries } = useMountCommunityContext();
  return summaries[spellId] ?? emptySummary();
}

export function MountCommunityProvider({
  mounts,
  children,
}: {
  mounts: Mount[];
  children: ReactNode;
}) {
  const { status } = useSession();
  const [summaries, setSummaries] = useState<
    Record<number, MountCommunitySummary>
  >({});
  const [loading, setLoading] = useState(true);

  const spellKey = useMemo(() => {
    const ids = mounts.map((m) => m.id);
    ids.sort((a, b) => a - b);
    return ids.join(",");
  }, [mounts]);

  const spellIdsFromKey = useMemo(() => {
    if (!spellKey) return [];
    return spellKey
      .split(",")
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));
  }, [spellKey]);

  useEffect(() => {
    if (spellKey === "") {
      setSummaries({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/mounts/community-batch", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spellIds: spellIdsFromKey }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          summaries?: Record<string, MountCommunitySummary>;
        };
        if (cancelled) return;
        if (!res.ok || !data.summaries) {
          setSummaries({});
          return;
        }
        const next: Record<number, MountCommunitySummary> = {};
        for (const [k, v] of Object.entries(data.summaries)) {
          const id = Number(k);
          if (Number.isFinite(id)) {
            next[id] = {
              commentCount: Number(v.commentCount) || 0,
              upCount: Number(v.upCount) || 0,
              downCount: Number(v.downCount) || 0,
              myVote:
                v.myVote === 1 || v.myVote === -1 ? v.myVote : null,
            };
          }
        }
        setSummaries(next);
      } catch {
        if (!cancelled) setSummaries({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spellKey, status, spellIdsFromKey]);

  const patchSpell = useCallback(
    (spellId: number, partial: Partial<MountCommunitySummary>) => {
      setSummaries((prev) => ({
        ...prev,
        [spellId]: {
          ...emptySummary(),
          ...prev[spellId],
          ...partial,
        },
      }));
    },
    [],
  );

  const mergeSummaries = useCallback(
    (map: Record<number, MountCommunitySummary>) => {
      setSummaries((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(map)) {
          const id = Number(k);
          if (!Number.isFinite(id)) continue;
          next[id] = {
            ...emptySummary(),
            ...prev[id],
            ...v,
          };
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ summaries, loading, patchSpell, mergeSummaries }),
    [summaries, loading, patchSpell, mergeSummaries],
  );

  return (
    <MountCommunityContext.Provider value={value}>
      {children}
    </MountCommunityContext.Provider>
  );
}
