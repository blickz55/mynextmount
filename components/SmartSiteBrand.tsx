"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import type { ComponentProps } from "react";

import { SiteBrand } from "@/components/SiteBrand";

const TOOL_ENGAGED_KEY = "mnm_tool_engaged_v1";

type Props = Omit<ComponentProps<typeof SiteBrand>, "homeHref">;

/**
 * Picks logo/hero destination: first-time guests → tool; returning guests → marketing `/`;
 * signed-in users with a saved collection → `/`; others → tool.
 */
export function SmartSiteBrand(props: Props) {
  const { status } = useSession();
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [localEngaged, setLocalEngaged] = useState(false);

  useEffect(() => {
    try {
      setLocalEngaged(
        typeof window !== "undefined" &&
          window.localStorage.getItem(TOOL_ENGAGED_KEY) === "1",
      );
    } catch {
      setLocalEngaged(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setSavedCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/collection");
        const data = (await res.json().catch(() => ({}))) as {
          spellIds?: unknown;
        };
        if (cancelled) {
          return;
        }
        const ids = Array.isArray(data.spellIds) ? data.spellIds : [];
        setSavedCount(ids.length);
      } catch {
        if (!cancelled) {
          setSavedCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const homeHref = (() => {
    if (status === "authenticated") {
      if (savedCount === null) {
        return "/tool";
      }
      return savedCount > 0 ? "/" : "/tool";
    }
    if (status === "unauthenticated" && !localEngaged) {
      return "/tool";
    }
    return "/";
  })();

  return <SiteBrand {...props} homeHref={homeHref} />;
}

export { TOOL_ENGAGED_KEY };
