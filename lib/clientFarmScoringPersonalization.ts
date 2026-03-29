import type { ScoringPersonalization } from "@/lib/scoring/types";

/** Normalize `communityBoostBySpellId` from farm-attempts JSON (string keys). */
export function parseCommunityBoostBySpellIdJson(
  raw: unknown,
): Record<number, number> {
  if (raw === null || typeof raw !== "object") return {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(k);
    if (!Number.isFinite(id)) continue;
    const n = Number(v);
    if (Number.isFinite(n)) out[id] = n;
  }
  return out;
}

/** Shape shared with farm row / `POST /api/collection/farm-attempts` (avoid importing client components). */
export type FarmRowK4Input = {
  attempts: number;
  lockout: {
    kind: "none" | "daily" | "weekly";
    state: "available" | "locked";
    unlocksAt: string | null;
  };
};

/**
 * Epic K.4 — map farm-attempts API payload into {@link ScoringPersonalization} for `/tool`.
 */
export function clientFarmScoringPersonalizationFromRows(params: {
  farmAttemptsBySpellId: Readonly<Record<number, FarmRowK4Input>>;
  nextWeeklyResetAt: string;
  /** Epic K.8 — from `POST /api/collection/farm-attempts` `communityBoostBySpellId`. */
  communityBoostBySpellId?: Readonly<Record<number, number>>;
}): ScoringPersonalization {
  const attemptsBySpellId: Record<number, number> = {};
  const lockoutBySpellId: Record<
    number,
    {
      kind: "none" | "daily" | "weekly";
      state: "available" | "locked";
      unlocksAt: string | null;
    }
  > = {};
  for (const [k, row] of Object.entries(params.farmAttemptsBySpellId)) {
    const id = Number(k);
    if (!Number.isFinite(id)) continue;
    attemptsBySpellId[id] = row.attempts;
    lockoutBySpellId[id] = row.lockout;
  }
  const out: ScoringPersonalization = {
    attemptsBySpellId,
    lockoutBySpellId,
    nextWeeklyResetAt: params.nextWeeklyResetAt,
    nowMs: Date.now(),
  };
  if (params.communityBoostBySpellId !== undefined) {
    out.communityBoostBySpellId = params.communityBoostBySpellId;
  }
  return out;
}
