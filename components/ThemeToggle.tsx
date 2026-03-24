"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mynextmount-theme";

export type ThemeChoice = "system" | "light" | "dark";

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }
}

/**
 * Cycles System → Light → Dark. Default follows device until user picks a mode (localStorage).
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") {
        setChoice(raw);
        applyTheme(raw);
      } else {
        applyTheme("system");
      }
    } catch {
      applyTheme("system");
    }
  }, []);

  const cycle = useCallback(() => {
    const order: ThemeChoice[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(choice) + 1) % order.length];
    setChoice(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
  }, [choice]);

  const label =
    choice === "system"
      ? "Theme: match device (click for light)"
      : choice === "light"
        ? "Theme: light (click for dark)"
        : "Theme: dark (click for system)";

  if (!mounted) {
    return (
      <div
        className="theme-toggle theme-toggle--placeholder"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {choice === "system" ? "◐" : choice === "light" ? "☀" : "☾"}
      </span>
      <span className="theme-toggle__text">
        {choice === "system" ? "Auto" : choice === "light" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
