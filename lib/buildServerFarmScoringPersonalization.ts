import type { PrismaClient, WeeklyResetCalendar } from "@prisma/client";

import { mounts } from "@/lib/mounts";
import {
  computeFarmLockoutAvailability,
  nextWeeklyResetUtc,
} from "@/lib/mountLockoutAvailability";
import { loadCommunityRecommendationBoostMap } from "@/lib/loadCommunityRecommendationBoostMap";
import type { ScoringPersonalization } from "@/lib/scoring/types";

const MOUNT_BY_ID = new Map(mounts.map((m) => [m.id, m]));

const MAX_IDS = 500;

/**
 * Epic K.4 — build {@link ScoringPersonalization} from DB for farm-target ranking (save path).
 */
export async function buildServerFarmScoringPersonalization(
  prisma: PrismaClient,
  userId: string,
  weeklyResetCalendar: WeeklyResetCalendar,
  spellIds: readonly number[],
): Promise<ScoringPersonalization> {
  const now = new Date();
  const nextAt = nextWeeklyResetUtc(now, weeklyResetCalendar).toISOString();
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const x of spellIds) {
    if (!Number.isFinite(x) || x <= 0) continue;
    const id = Math.floor(x);
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_IDS) break;
  }

  if (ids.length === 0) {
    return {
      nextWeeklyResetAt: nextAt,
      nowMs: now.getTime(),
      communityBoostBySpellId: {},
    };
  }

  const [attemptRows, completionRows, communityBoostBySpellId] =
    await Promise.all([
      prisma.mountFarmAttempt.findMany({
        where: { userId, spellId: { in: ids } },
      }),
      prisma.mountLockoutCompletion.findMany({
        where: { userId, spellId: { in: ids } },
      }),
      loadCommunityRecommendationBoostMap(prisma, ids),
    ]);

  const attemptsBySpellId: Record<number, number> = {};
  for (const r of attemptRows) {
    attemptsBySpellId[r.spellId] = r.attempts;
  }
  const completionBy = new Map(
    completionRows.map((c) => [c.spellId, c]),
  );
  const lockoutBySpellId: Record<
    number,
    {
      kind: "none" | "daily" | "weekly";
      state: "available" | "locked";
      unlocksAt: string | null;
    }
  > = {};
  for (const sid of ids) {
    const m = MOUNT_BY_ID.get(sid);
    if (!m) continue;
    const comp = completionBy.get(sid);
    const av = computeFarmLockoutAvailability(
      m.lockout,
      comp?.lastCompletedAt ?? null,
      now,
      weeklyResetCalendar,
    );
    lockoutBySpellId[sid] = {
      kind: av.kind,
      state: av.state,
      unlocksAt: av.unlocksAtIso,
    };
  }

  return {
    attemptsBySpellId,
    lockoutBySpellId,
    communityBoostBySpellId,
    nextWeeklyResetAt: nextAt,
    nowMs: now.getTime(),
  };
}
