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
  /** From `data/mount-hover-lore.json` (batch); preferred. */
  prebakedLore?: string;
  /** Plain spotlight when no prebaked Archivist entry. */
  flavorFallback?: string;
};

type TooltipPhase = "hidden" | "ready" | "empty";

type LoreContextValue = {
  onRowEnter: (payload: OwnedMountLoreHoverPayload) => void;
  onRowMove: (clientX: number, clientY: number) => void;
  onRowLeave: () => void;
};

const LoreRowContext = createContext<LoreContextValue | null>(null);

export function useOwnedMountLoreRow(): LoreContextValue | null {
  return useContext(LoreRowContext);
}

const LEAVE_MS = 320;

/** Shown when batch lore is not generated yet — keep copy end-user safe (no maintainer commands). */
const NO_LORE_YET_MSG =
  "The Archivist has no tale for this mount in our ledger yet. We add new verses over time—check back later.";

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

function resolveHoverBody(payload: OwnedMountLoreHoverPayload): {
  phase: "ready" | "empty";
  lore: string;
  emptyMsg: string | null;
} {
  const archivist = payload.prebakedLore?.trim();
  if (archivist) {
    return { phase: "ready", lore: archivist, emptyMsg: null };
  }
  const fb = payload.flavorFallback?.trim();
  if (fb) {
    return { phase: "ready", lore: fb, emptyMsg: null };
  }
  return { phase: "empty", lore: "", emptyMsg: NO_LORE_YET_MSG };
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
  const [emptyMsg, setEmptyMsg] = useState<string | null>(null);

  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const hideNow = useCallback(() => {
    clearLeaveTimer();
    visibleRef.current = false;
    setPhase("hidden");
    setLore("");
    setEmptyMsg(null);
    setTitle("");
  }, [clearLeaveTimer]);

  const scheduleHide = useCallback(() => {
    clearLeaveTimer();
    leaveTimerRef.current = setTimeout(() => {
      hideNow();
    }, LEAVE_MS);
  }, [clearLeaveTimer, hideNow]);

  const onRowEnter = useCallback(
    (payload: OwnedMountLoreHoverPayload) => {
      clearLeaveTimer();
      visibleRef.current = true;
      snapNextRef.current = true;
      setTitle(payload.mountName);
      setTheme(payload.theme);

      const r = resolveHoverBody(payload);
      if (r.phase === "ready") {
        setLore(r.lore);
        setEmptyMsg(null);
        setPhase("ready");
      } else {
        setLore("");
        setEmptyMsg(r.emptyMsg);
        setPhase("empty");
      }
    },
    [clearLeaveTimer],
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
      clearLeaveTimer();
    };
  }, [clearLeaveTimer]);

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
              {phase === "ready" && lore ? (
                <div
                  className="mount-lore-relic__body mount-lore-relic__body--ink"
                  key={lore.slice(0, 24)}
                >
                  <LoreMarkdown text={lore} />
                </div>
              ) : null}
              {phase === "empty" && emptyMsg ? (
                <p className="mount-lore-relic__empty-note">{emptyMsg}</p>
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
