"use client";

import type { WeeklyResetCalendar } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { weeklyResetCalendarToApi } from "@/lib/parseWeeklyResetCalendar";

type ApiVal = "americas_oceania" | "europe";

const OPTIONS: {
  value: ApiVal;
  label: string;
  detail: string;
}[] = [
  {
    value: "americas_oceania",
    label: "Americas & Oceania (default)",
    detail:
      "Weekly periods roll on Tuesday 15:00 UTC (~8:00 AM US Pacific maintenance; your local clock shifts with DST).",
  },
  {
    value: "europe",
    label: "Europe",
    detail:
      "Weekly periods roll on Wednesday 04:00 UTC (often shown around 4–5 AM in CET).",
  },
];

export function WeeklyResetCalendarPreference({
  initial,
}: {
  initial: WeeklyResetCalendar;
}) {
  const router = useRouter();
  const initialApi = weeklyResetCalendarToApi(initial);
  const [value, setValue] = useState<ApiVal>(initialApi);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(next: ApiVal) {
    if (next === value || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyResetCalendar: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Could not save that.");
        return;
      }
      setValue(next);
      setMessage("Saved.");
      router.refresh();
    } catch {
      setMessage("Network blip — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <fieldset
      className="weekly-reset-fieldset"
      disabled={pending}
      aria-busy={pending}
    >
      <legend className="weekly-reset-fieldset__legend">
        When does your week reset?
      </legend>
      <p className="section-intro weekly-reset-fieldset__intro">
        For mounts on a <strong>weekly</strong> timer. Daily timers are just{" "}
        <strong>24 hours</strong> after a save that counted that mount. We store
        UTC; cards show your local time.
      </p>
      <div className="weekly-reset-options">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="weekly-reset-option">
            <input
              type="radio"
              name="weekly-reset-calendar"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => void onChange(opt.value)}
            />
            <span className="weekly-reset-option__text">
              <span className="weekly-reset-option__label">{opt.label}</span>
              <span className="weekly-reset-option__detail">{opt.detail}</span>
            </span>
          </label>
        ))}
      </div>
      {message !== null ? (
        <p className="field-hint" role="status">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
