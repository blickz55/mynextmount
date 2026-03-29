import type { WeeklyResetCalendar } from "@prisma/client";

/**
 * Parse JSON body / form values for `PATCH /api/account` (Epic K.3).
 */
export function parseWeeklyResetCalendarInput(
  raw: unknown,
): WeeklyResetCalendar | null {
  if (raw === "americas_oceania" || raw === "AMERICAS_OCEANIA") {
    return "AMERICAS_OCEANIA";
  }
  if (raw === "europe" || raw === "EUROPE") {
    return "EUROPE";
  }
  return null;
}

export function weeklyResetCalendarToApi(
  v: WeeklyResetCalendar,
): "americas_oceania" | "europe" {
  return v === "EUROPE" ? "europe" : "americas_oceania";
}
