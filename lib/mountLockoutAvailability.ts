import type { WeeklyResetCalendar } from "@prisma/client";

import type { Mount } from "@/types/mount";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type FarmLockoutKind = "none" | "daily" | "weekly";

export type FarmLockoutAvailability = {
  kind: FarmLockoutKind;
  state: "available" | "locked";
  /** ISO instant when the mount becomes available again; null if not locked or N/A */
  unlocksAtIso: string | null;
};

/**
 * Latest scheduled weekly reset instant ≤ `now` (UTC).
 * Americas & Oceania: Tuesday 15:00 UTC. Europe: Wednesday 04:00 UTC (Epic K.3).
 */
export function lastWeeklyPeriodStartUtc(
  now: Date,
  calendar: WeeklyResetCalendar,
): Date {
  const weekdayUtc = calendar === "AMERICAS_OCEANIA" ? 2 : 3; // Tue, Wed (getUTCDay)
  const hourUtc = calendar === "AMERICAS_OCEANIA" ? 15 : 4;
  const minuteUtc = 0;

  let best: Date | null = null;
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d0 = now.getUTCDate();
  const t = now.getTime();

  for (let k = 0; k < 400; k++) {
    const dt = new Date(Date.UTC(y, m, d0 - k, hourUtc, minuteUtc, 0, 0));
    if (dt.getUTCDay() !== weekdayUtc) continue;
    if (dt.getTime() <= t) {
      if (!best || dt.getTime() > best.getTime()) best = dt;
    }
  }

  if (!best) {
    throw new Error("lastWeeklyPeriodStartUtc: no boundary found");
  }
  return best;
}

function addUtcDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

export function computeFarmLockoutAvailability(
  mountLockout: Mount["lockout"],
  lastCompletedAt: Date | null,
  now: Date,
  weeklyCalendar: WeeklyResetCalendar,
): FarmLockoutAvailability {
  if (mountLockout !== "daily" && mountLockout !== "weekly") {
    return { kind: "none", state: "available", unlocksAtIso: null };
  }

  const kind: FarmLockoutKind = mountLockout;

  if (!lastCompletedAt) {
    return { kind, state: "available", unlocksAtIso: null };
  }

  const c = lastCompletedAt.getTime();

  if (kind === "daily") {
    const unlock = new Date(c + MS_PER_DAY);
    if (now.getTime() >= unlock.getTime()) {
      return { kind, state: "available", unlocksAtIso: null };
    }
    return {
      kind,
      state: "locked",
      unlocksAtIso: unlock.toISOString(),
    };
  }

  const periodStart = lastWeeklyPeriodStartUtc(now, weeklyCalendar);
  if (c < periodStart.getTime()) {
    return { kind, state: "available", unlocksAtIso: null };
  }

  const nextUnlock = addUtcDays(periodStart, 7);
  return {
    kind,
    state: "locked",
    unlocksAtIso: nextUnlock.toISOString(),
  };
}

/** Next weekly reset instant (UTC) after `now` for the user’s calendar (Epic K.3 / K.4). */
export function nextWeeklyResetUtc(
  now: Date,
  calendar: WeeklyResetCalendar,
): Date {
  const periodStart = lastWeeklyPeriodStartUtc(now, calendar);
  return addUtcDays(periodStart, 7);
}
