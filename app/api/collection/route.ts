import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { diffSpellIdSets } from "@/lib/collectionSnapshotDiff";
import { buildServerFarmScoringPersonalization } from "@/lib/buildServerFarmScoringPersonalization";
import { K_ATTEMPT_INCREMENT_CAP, K_ATTEMPT_SPAM_WINDOW_MS } from "@/lib/farmAttemptConstants";
import { mounts } from "@/lib/mounts";
import { prisma } from "@/lib/prisma";
import { recommendationScorer } from "@/lib/scoring";
import { sortMountsByScore } from "@/lib/selectTopMountsByScore";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";
import { retryAsync } from "@/lib/retryAsync";
import {
  deserializeSpellIds,
  MAX_SAVED_SPELL_IDS,
  serializeSpellIds,
} from "@/lib/savedCollection";
import { spellIdsWithNames } from "@/lib/snapshotSpellNames";
import {
  farmTargetRankingMounts,
  normalizeSourceFiltersForSave,
  parseRecommendationModeForSave,
} from "@/lib/topFarmTargetsForSave";

const MOUNT_BY_ID = new Map(mounts.map((m) => [m.id, m]));

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const user = await retryAsync(
      () => findAppUserFromSession(session.user),
      { retries: 2, delayMs: 350 },
    );
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const spellIds = deserializeSpellIds(
      typeof user.collectionSpellIds === "string" ? user.collectionSpellIds : "",
    );
    return NextResponse.json({
      spellIds,
      updatedAt: user.collectionUpdatedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("[api/collection GET]", e);
    return NextResponse.json(
      { error: "Could not load saved collection." },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
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
  const b = body as {
    spellIds?: unknown;
    recommendationMode?: unknown;
    sourceFilters?: unknown;
    farmSearchQuery?: unknown;
  };
  const raw = b.spellIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "spellIds must be an array" }, { status: 400 });
  }
  if (raw.length > MAX_SAVED_SPELL_IDS) {
    return NextResponse.json(
      { error: `At most ${MAX_SAVED_SPELL_IDS} spell IDs` },
      { status: 400 },
    );
  }
  const nums = raw.map((x) => Number(x)).filter(
    (n) => Number.isFinite(n) && n > 0 && n <= 2 ** 31 - 1,
  );
  const serialized = serializeSpellIds(nums);
  const nextIds = deserializeSpellIds(serialized);

  try {
    const user = await findAppUserFromSession(session.user);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prevSerialized =
      typeof user.collectionSpellIds === "string" ? user.collectionSpellIds : "";
    const prevAt = user.collectionUpdatedAt;
    const spamSameCollection =
      serialized === prevSerialized &&
      prevAt != null &&
      Date.now() - prevAt.getTime() < K_ATTEMPT_SPAM_WINDOW_MS;

    const saveMode = parseRecommendationModeForSave(b.recommendationMode);
    const saveFilters = normalizeSourceFiltersForSave(b.sourceFilters);
    const farmSearchQuery =
      typeof b.farmSearchQuery === "string" ? b.farmSearchQuery : "";

    /** K.1.3 — no snapshot row for empty collection (still clear `User.collectionSpellIds`). */
    if (nextIds.length === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          collectionSpellIds: serialized,
          collectionUpdatedAt: new Date(),
        },
      });
      return NextResponse.json({
        ok: true,
        count: 0,
        snapshot: null,
        farmAttempts: { skippedIncrement: false, spellIdsBumped: 0 },
      });
    }

    const latest = await prisma.mountCollectionSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const duplicateSkipped = Boolean(latest && latest.spellIds === serialized);
    const skipFarmAttemptIncrement = duplicateSkipped || spamSameCollection;

    /**
     * One transaction for user row + optional snapshot so we never persist an updated
     * collection without a matching snapshot row (or clear failure for both).
     */
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          collectionSpellIds: serialized,
          collectionUpdatedAt: new Date(),
        },
      });
      if (!duplicateSkipped) {
        await tx.mountCollectionSnapshot.create({
          data: {
            userId: user.id,
            spellIds: serialized,
          },
        });
      }
    });

    let diff: {
      addedSpellIds: number[];
      removedSpellIds: number[];
      added: { spellId: number; name: string }[];
      removed: { spellId: number; name: string }[];
    };

    if (!latest) {
      diff = {
        addedSpellIds: [],
        removedSpellIds: [],
        added: [],
        removed: [],
      };
    } else if (duplicateSkipped) {
      diff = {
        addedSpellIds: [],
        removedSpellIds: [],
        added: [],
        removed: [],
      };
    } else {
      const prevIds = deserializeSpellIds(latest.spellIds);
      const d = diffSpellIdSets(prevIds, nextIds);
      diff = {
        addedSpellIds: d.added,
        removedSpellIds: d.removed,
        added: spellIdsWithNames(d.added),
        removed: spellIdsWithNames(d.removed),
      };
    }

    let spellIdsBumped = 0;
    let farmSideEffectsFailed = false;
    if (!skipFarmAttemptIncrement) {
      try {
        const ranked = farmTargetRankingMounts(
          nextIds,
          saveMode,
          saveFilters,
          farmSearchQuery,
        );
        const sliceIds = ranked.slice(0, 500).map((m) => m.id);
        const personalization = await buildServerFarmScoringPersonalization(
          prisma,
          user.id,
          user.weeklyResetCalendar,
          sliceIds,
        );
        const scoreFn = recommendationScorer(saveMode, { personalization });
        const reranked = sortMountsByScore(ranked, scoreFn);
        const targetIds = reranked
          .slice(0, K_ATTEMPT_INCREMENT_CAP)
          .map((m) => m.id);
        if (targetIds.length > 0) {
          const now = new Date();
          const lockoutSpellIds = targetIds.filter((spellId) => {
            const m = MOUNT_BY_ID.get(spellId);
            return (
              m !== undefined &&
              (m.lockout === "daily" || m.lockout === "weekly")
            );
          });
          /**
           * Interactive transaction supports `timeout` / `maxWait`; the array form does not.
           * Default 5s is too tight for ~50 upserts on Vercel + Supabase pooler.
           */
          await prisma.$transaction(
            async (tx) => {
              for (const spellId of targetIds) {
                await tx.mountFarmAttempt.upsert({
                  where: {
                    userId_spellId: { userId: user.id, spellId },
                  },
                  create: {
                    userId: user.id,
                    spellId,
                    attempts: 1,
                    lastAttemptAt: now,
                  },
                  update: {
                    attempts: { increment: 1 },
                    lastAttemptAt: now,
                  },
                });
              }
              for (const spellId of lockoutSpellIds) {
                await tx.mountLockoutCompletion.upsert({
                  where: {
                    userId_spellId: { userId: user.id, spellId },
                  },
                  create: {
                    userId: user.id,
                    spellId,
                    lastCompletedAt: now,
                  },
                  update: { lastCompletedAt: now },
                });
              }
            },
            { maxWait: 15_000, timeout: 25_000 },
          );
          spellIdsBumped = targetIds.length;
        }
      } catch (farmErr) {
        farmSideEffectsFailed = true;
        console.error("[api/collection PUT] farm/lockout side effects", farmErr);
      }
    }

    return NextResponse.json({
      ok: true,
      count: nextIds.length,
      snapshot: {
        duplicateSkipped,
        diff,
      },
      farmAttempts: {
        skippedIncrement: skipFarmAttemptIncrement,
        spellIdsBumped,
        sideEffectsFailed: farmSideEffectsFailed,
      },
    });
  } catch (e) {
    console.error("[api/collection PUT]", e);
    const hint =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : undefined;
    return NextResponse.json(
      {
        error: hint
          ? `Save failed: ${hint}`
          : "Save failed — server could not update your collection. If this persists, check database connectivity (e.g. DATABASE_URL on the host).",
      },
      { status: 500 },
    );
  }
}
