import { describe, expect, it } from "vitest";
import { formatUnlockInShort } from "@/lib/formatLockoutCountdown";
import {
  computeFarmLockoutAvailability,
  lastWeeklyPeriodStartUtc,
} from "@/lib/mountLockoutAvailability";
import { parseWeeklyResetCalendarInput } from "@/lib/parseWeeklyResetCalendar";

describe("lastWeeklyPeriodStartUtc", () => {
  it("Americas: Wed 10:00 UTC uses prior Tue 15:00", () => {
    const now = new Date("2025-01-08T10:00:00.000Z");
    const p = lastWeeklyPeriodStartUtc(now, "AMERICAS_OCEANIA");
    expect(p.toISOString()).toBe("2025-01-07T15:00:00.000Z");
  });

  it("Americas: Tue 16:00 UTC uses same day Tue 15:00", () => {
    const now = new Date("2025-01-07T16:00:00.000Z");
    const p = lastWeeklyPeriodStartUtc(now, "AMERICAS_OCEANIA");
    expect(p.toISOString()).toBe("2025-01-07T15:00:00.000Z");
  });

  it("Europe: Wed 10:00 UTC uses same day Wed 04:00", () => {
    const now = new Date("2025-01-08T10:00:00.000Z");
    const p = lastWeeklyPeriodStartUtc(now, "EUROPE");
    expect(p.toISOString()).toBe("2025-01-08T04:00:00.000Z");
  });
});

describe("computeFarmLockoutAvailability", () => {
  it("treats none as always available", () => {
    const r = computeFarmLockoutAvailability(
      "none",
      new Date(),
      new Date(),
      "AMERICAS_OCEANIA",
    );
    expect(r).toEqual({
      kind: "none",
      state: "available",
      unlocksAtIso: null,
    });
  });

  it("daily with no completion is available", () => {
    const r = computeFarmLockoutAvailability(
      "daily",
      null,
      new Date("2025-01-10T12:00:00.000Z"),
      "AMERICAS_OCEANIA",
    );
    expect(r.state).toBe("available");
    expect(r.kind).toBe("daily");
  });

  it("daily locks until +24h", () => {
    const now = new Date("2025-01-10T12:00:00.000Z");
    const done = new Date("2025-01-10T00:00:00.000Z");
    const r = computeFarmLockoutAvailability(
      "daily",
      done,
      now,
      "AMERICAS_OCEANIA",
    );
    expect(r.state).toBe("locked");
    expect(r.unlocksAtIso).toBe(
      new Date("2025-01-11T00:00:00.000Z").toISOString(),
    );
  });

  it("weekly: completion before current period start is available", () => {
    const now = new Date("2025-01-08T10:00:00.000Z");
    const done = new Date("2025-01-06T12:00:00.000Z");
    const r = computeFarmLockoutAvailability(
      "weekly",
      done,
      now,
      "AMERICAS_OCEANIA",
    );
    expect(r.state).toBe("available");
  });

  it("weekly: completion in current period locks until next boundary", () => {
    const now = new Date("2025-01-08T10:00:00.000Z");
    const done = new Date("2025-01-07T18:00:00.000Z");
    const r = computeFarmLockoutAvailability(
      "weekly",
      done,
      now,
      "AMERICAS_OCEANIA",
    );
    expect(r.state).toBe("locked");
    expect(r.unlocksAtIso).toBe("2025-01-14T15:00:00.000Z");
  });
});

describe("formatUnlockInShort", () => {
  it("returns now when unlock is in the past", () => {
    const u = new Date(Date.now() - 120_000);
    expect(formatUnlockInShort(u)).toBe("now");
  });
});

describe("parseWeeklyResetCalendarInput", () => {
  it("accepts api and prisma-style strings", () => {
    expect(parseWeeklyResetCalendarInput("americas_oceania")).toBe(
      "AMERICAS_OCEANIA",
    );
    expect(parseWeeklyResetCalendarInput("europe")).toBe("EUROPE");
    expect(parseWeeklyResetCalendarInput("EUROPE")).toBe("EUROPE");
  });

  it("rejects unknown", () => {
    expect(parseWeeklyResetCalendarInput("asia")).toBeNull();
  });
});
