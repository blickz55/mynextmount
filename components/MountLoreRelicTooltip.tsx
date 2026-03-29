"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";

import type { MountLoreTheme } from "@/lib/mountLoreTheme";

export type OwnedMountLoreHoverPayload = {
  spellId: number;
  mountName: string;
  expansion: string;
  source?: string;
  location?: string;
  tags?: string[];
  theme: MountLoreTheme;
  /** Shown if API missing or request fails */
  flavorFallback?: string;
};

type TooltipPhase = "hidden" | "loading" | "ready" | "error";

type LoreContextValue = {
  onRowEnter: (payload: OwnedMountLoreHoverPayload) => void;
  onRowMove: (clientX: number, clientY: number) => void;
  onRowLeave: () => void;
};

const LoreRowContext = createContext<LoreContextValue | null>(null);

export function useOwnedMountLoreRow(): LoreContextValue | null {
  return useContext(LoreRowContext);
}

const ENTER_MS = 160;
const LEAVE_MS = 320;
const CACHE_MAX = 80;

function clampTooltipTarget(
  clientX: number,
  clientY: number,
  vw: number,
  vh: number,
) {
  const estW = 300;
  const estH = 260;
  const pad = 12;
  const ox = 16;
  const oy = 20;
  let x = clientX + ox;
  let y = clientY + oy;
  x = Math.max(pad, Math.min(x, vw - estW - pad));
  y = Math.max(pad, Math.min(y, vh - estH - pad));
  return { x, y };
}

function LoreMarkdown({ text }: { text: string }) {
  return (
    <div className="mount-lore-relic__markdown">
      <Markdown
        components={{
          p: ({ children }) => (
            <p className="mount-lore-relic__md-p">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="mount-lore-relic__md-strong">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="mount-lore-relic__md-em">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mount-lore-relic__md-bq">{children}</blockquote>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

export function OwnedMountsLoreProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  const snapNextRef = useRef(true);
  const visibleRef = useRef(false);

  const [phase, setPhase] = useState<TooltipPhase>("hidden");
  const [lore, setLore] = useState("");
  const [theme, setTheme] = useState<MountLoreTheme>("default");
  const [title, setTitle] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activePayloadRef = useRef<OwnedMountLoreHoverPayload | null>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(
    new Map<number, { lore: string; theme: MountLoreTheme }>(),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearEnterTimer = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  }, []);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const hideNow = useCallback(() => {
    clearEnterTimer();
    clearLeaveTimer();
    abortRef.current?.abort();
    abortRef.current = null;
    activePayloadRef.current = null;
    visibleRef.current = false;
    setPhase("hidden");
    setLore("");
    setErrorMsg(null);
    setTitle("");
  }, [clearEnterTimer, clearLeaveTimer]);

  const scheduleHide = useCallback(() => {
    clearEnterTimer();
    clearLeaveTimer();
    leaveTimerRef.current = setTimeout(() => {
      hideNow();
    }, LEAVE_MS);
  }, [clearEnterTimer, clearLeaveTimer, hideNow]);

  const runFetch = useCallback(
    async (payload: OwnedMountLoreHoverPayload) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const cached = cacheRef.current.get(payload.spellId);
      if (cached) {
        if (activePayloadRef.current?.spellId !== payload.spellId) return;
        setLore(cached.lore);
        setTheme(cached.theme);
        setPhase("ready");
        return;
      }

      setPhase("loading");
      setErrorMsg(null);
      setLore("");
      setTheme(payload.theme);
      setTitle(payload.mountName);

      try {
        const res = await fetch("/api/generate-lore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            spellId: payload.spellId,
            mountName: payload.mountName,
            expansion: payload.expansion,
            source: payload.source,
            location: payload.location,
            tags: payload.tags,
            theme: payload.theme,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          lore?: string;
          theme?: MountLoreTheme;
          code?: string;
          message?: string;
          error?: string;
        };

        if (activePayloadRef.current?.spellId !== payload.spellId) return;

        if (res.status === 503 && data.code === "NO_API_KEY") {
          const fb = payload.flavorFallback?.trim();
          if (fb) {
            setLore(fb);
            setPhase("ready");
            return;
          }
          setErrorMsg(
            data.message ||
              "Add OPENAI_API_KEY on the server to summon Archivist lore.",
          );
          setPhase("error");
          return;
        }

        if (!res.ok || !data.ok || !data.lore?.trim()) {
          const fb = payload.flavorFallback?.trim();
          if (fb) {
            setLore(fb);
            setPhase("ready");
            return;
          }
          setErrorMsg(
            typeof data.error === "string"
              ? data.error
              : "The timeways shuddered; no tale returned.",
          );
          setPhase("error");
          return;
        }

        const text = data.lore.trim();
        const th = data.theme ?? payload.theme;
        cacheRef.current.set(payload.spellId, { lore: text, theme: th });
        if (cacheRef.current.size > CACHE_MAX) {
          const first = cacheRef.current.keys().next().value;
          if (first !== undefined) cacheRef.current.delete(first);
        }
        setLore(text);
        setTheme(th);
        setPhase("ready");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (activePayloadRef.current?.spellId !== payload.spellId) return;
        const fb = payload.flavorFallback?.trim();
        if (fb) {
          setLore(fb);
          setPhase("ready");
          return;
        }
        setErrorMsg("The chronicle frayed before it could be read.");
        setPhase("error");
      }
    },
    [],
  );

  const onRowEnter = useCallback(
    (payload: OwnedMountLoreHoverPayload) => {
      clearLeaveTimer();
      activePayloadRef.current = payload;
      visibleRef.current = true;
      snapNextRef.current = true;
      setTitle(payload.mountName);
      setTheme(payload.theme);

      clearEnterTimer();
      enterTimerRef.current = setTimeout(() => {
        if (activePayloadRef.current?.spellId !== payload.spellId) return;
        void runFetch(payload);
      }, ENTER_MS);
    },
    [clearEnterTimer, clearLeaveTimer, runFetch],
  );

  const onRowMove = useCallback(
    (clientX: number, clientY: number) => {
      clearLeaveTimer();
      const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      const c = clampTooltipTarget(clientX, clientY, vw, vh);
      targetRef.current = c;
    },
    [clearLeaveTimer],
  );

  const onRowLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const ctx = useMemo<LoreContextValue>(
    () => ({ onRowEnter, onRowMove, onRowLeave }),
    [onRowEnter, onRowMove, onRowLeave],
  );

  useEffect(() => {
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const el = shellRef.current;
      if (el && visibleRef.current) {
        const t = targetRef.current;
        const p = posRef.current;
        if (snapNextRef.current) {
          p.x = t.x;
          p.y = t.y;
          snapNextRef.current = false;
        } else {
          const k = 0.16;
          p.x += (t.x - p.x) * k;
          p.y += (t.y - p.y) * k;
        }
        el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearEnterTimer();
      clearLeaveTimer();
      abortRef.current?.abort();
    };
  }, [clearEnterTimer, clearLeaveTimer]);

  const portal =
    mounted && phase !== "hidden"
      ? createPortal(
          <div
            ref={shellRef}
            className={`mount-lore-relic mount-lore-relic--theme-${theme}`}
            role="tooltip"
            aria-live="polite"
          >
            <div className="mount-lore-relic__rim" aria-hidden />
            <div className="mount-lore-relic__inner">
              <p className="mount-lore-relic__title">{title}</p>
              {phase === "loading" ? (
                <div
                  className="mount-lore-relic__loading"
                  aria-label="Summoning lore"
                >
                  <span className="mount-lore-relic__shimmer" />
                  <span className="mount-lore-relic__loading-text">
                    The Archivist turns a page…
                  </span>
                </div>
              ) : null}
              {phase === "ready" && lore ? (
                <div
                  className="mount-lore-relic__body mount-lore-relic__body--ink"
                  key={lore.slice(0, 24)}
                >
                  <LoreMarkdown text={lore} />
                </div>
              ) : null}
              {phase === "error" ? (
                <p className="mount-lore-relic__error">{errorMsg}</p>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <LoreRowContext.Provider value={ctx}>
      {children}
      {portal}
    </LoreRowContext.Provider>
  );
}
