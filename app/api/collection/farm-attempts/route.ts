import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { FARM_ATTEMPT_LOOKUP_MAX_IDS } from "@/lib/farmAttemptConstants";
import {
  computeFarmLockoutAvailability,
  nextWeeklyResetUtc,
} from "@/lib/mountLockoutAvailability";
import { mounts } from "@/lib/mounts";
import { loadCommunityRecommendationBoostMap } from "@/lib/loadCommunityRecommendationBoostMap";
import { prisma } from "@/lib/prisma";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";
import { probabilityAtLeastOneDropSeenPercent } from "@/lib/probabilityAtLeastOneDrop";
import type { Mount } from "@/types/mount";

export const runtime = "nodejs";

const MAX_LOOKUP = FARM_ATTEMPT_LOOKUP_MAX_IDS;

const DROP_BY_SPELL = new Map(mounts.map((m) => [m.id, m.dropRate]));
const LOCKOUT_BY_SPELL = new Map(mounts.map((m) => [m.id, m.lockout]));

/**
 * Epic K.2 + K.3 — batch lookup farm attempts, lockout availability, and heuristic P(≥1 drop).
 * POST JSON `{ spellIds: number[] }` (max 500, positive integers).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const raw = (body as { spellIds?: unknown }).spellIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "spellIds must be an array" }, { status: 400 });
  }

  const seen = new Set<number>();
  const spellIds: number[] = [];
  for (const x of raw) {
    const n = Number(x);
    if (!Number.isFinite(n) || n <= 0 || n > 2 ** 31 - 1) continue;
    const id = Math.floor(n);
    if (seen.has(id)) continue;
    seen.add(id);
    spellIds.push(id);
    if (spellIds.length >= MAX_LOOKUP) break;
  }

  const user = await findAppUserFromSession(session.user);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [attemptRows, completionRows, communityBoostBySpellId] =
      spellIds.length === 0
        ? [[], [], {} as Record<number, number>]
        : await Promise.all([
            prisma.mountFarmAttempt.findMany({
              where: {
                userId: user.id,
                spellId: { in: spellIds },
              },
            }),
            prisma.mountLockoutCompletion.findMany({
              where: {
                userId: user.id,
                spellId: { in: spellIds },
              },
            }),
            loadCommunityRecommendationBoostMap(prisma, spellIds),
          ]);

    const bySpell = new Map(attemptRows.map((r) => [r.spellId, r]));
    const byCompletion = new Map(
      completionRows.map((r) => [r.spellId, r]),
    );

    const bySpellId: Record<
      string,
      {
        attempts: number;
        lastAttemptAt: string | null;
        pSeenDropPct: number | null;
        lockout: {
          kind: "none" | "daily" | "weekly";
          state: "available" | "locked";
          unlocksAt: string | null;
        };
      }
    > = {};

    const now = new Date();
    const cal = user.weeklyResetCalendar;

    for (const sid of spellIds) {
      const row = bySpell.get(sid);
      const attempts = row?.attempts ?? 0;
      const dropRate = DROP_BY_SPELL.get(sid) ?? 0;
      const pSeenDropPct =
        attempts > 0
          ? probabilityAtLeastOneDropSeenPercent(dropRate, attempts)
          : null;
      const lockoutCatalog = (LOCKOUT_BY_SPELL.get(sid) ??
        "none") as Mount["lockout"];
      const comp = byCompletion.get(sid);
      const av = computeFarmLockoutAvailability(
        lockoutCatalog,
        comp?.lastCompletedAt ?? null,
        now,
        cal,
      );
      bySpellId[String(sid)] = {
        attempts,
        lastAttemptAt: row?.lastAttemptAt?.toISOString() ?? null,
        pSeenDropPct,
        lockout: {
          kind: av.kind,
          state: av.state,
          unlocksAt: av.unlocksAtIso,
        },
      };
    }

    const communityBoostJson: Record<string, number> = {};
    for (const [k, v] of Object.entries(communityBoostBySpellId)) {
      communityBoostJson[String(k)] = v;
    }

    return NextResponse.json({
      bySpellId,
      communityBoostBySpellId: communityBoostJson,
      nextWeeklyResetAt: nextWeeklyResetUtc(now, cal).toISOString(),
    });
  } catch (e) {
    console.error("[api/collection/farm-attempts POST]", e);
    return NextResponse.json(
      { error: "Could not load farm attempts." },
      { status: 500 },
    );
  }
}
