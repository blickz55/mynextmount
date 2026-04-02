import { prisma } from "@/lib/prisma";
import type { MountCommunitySummary } from "@/types/mountCommunity";

function emptySummary(): MountCommunitySummary {
  return {
    commentCount: 0,
    upCount: 0,
    downCount: 0,
    myVote: null,
  };
}

/**
 * Build per-spell summaries for the farm list (one round-trip for counts + optional my votes).
 */
export async function loadMountCommunitySummaries(
  spellIds: number[],
  userId: string | undefined,
): Promise<Record<number, MountCommunitySummary>> {
  const out: Record<number, MountCommunitySummary> = {};
  for (const id of spellIds) {
    out[id] = emptySummary();
  }
  if (spellIds.length === 0) return out;

  const [commentGroups, voteGroups, mine] = await Promise.all([
    prisma.mountComment.groupBy({
      by: ["spellId"],
      where: { spellId: { in: spellIds } },
      _count: true,
    }),
    prisma.mountListingVote.groupBy({
      by: ["spellId", "value"],
      where: { spellId: { in: spellIds } },
      _count: true,
    }),
    userId
      ? prisma.mountListingVote.findMany({
          where: { userId, spellId: { in: spellIds } },
          select: { spellId: true, value: true },
        })
      : Promise.resolve([]),
  ]);

  for (const row of commentGroups) {
    if (out[row.spellId]) {
      out[row.spellId]!.commentCount = row._count;
    }
  }

  for (const row of voteGroups) {
    const s = out[row.spellId];
    if (!s) continue;
    if (row.value === 1) s.upCount = row._count;
    if (row.value === -1) s.downCount = row._count;
  }

  for (const row of mine) {
    const s = out[row.spellId];
    if (!s) continue;
    if (row.value === 1 || row.value === -1) {
      s.myVote = row.value;
    }
  }

  return out;
}

/**
 * Single-spell summary for API routes after a write. Uses `groupBy` batch logic first;
 * if that fails, falls back to plain `count` / `findUnique` so votes and comments still return
 * usable totals (some hosted DB setups choke on `groupBy` with certain poolers or policies).
 */
export async function getMountCommunitySummaryResilient(
  spellId: number,
  userId: string | undefined,
): Promise<MountCommunitySummary> {
  try {
    const map = await loadMountCommunitySummaries([spellId], userId);
    return map[spellId] ?? emptySummary();
  } catch (e) {
    console.error("[getMountCommunitySummaryResilient] groupBy path", e);
    try {
      const [commentCount, upCount, downCount, mine] = await Promise.all([
        prisma.mountComment.count({ where: { spellId } }),
        prisma.mountListingVote.count({ where: { spellId, value: 1 } }),
        prisma.mountListingVote.count({ where: { spellId, value: -1 } }),
        userId
          ? prisma.mountListingVote.findUnique({
              where: { userId_spellId: { userId, spellId } },
              select: { value: true },
            })
          : Promise.resolve(null),
      ]);
      const v = mine?.value;
      return {
        commentCount,
        upCount,
        downCount,
        myVote: v === 1 ? 1 : v === -1 ? -1 : null,
      };
    } catch (e2) {
      console.error("[getMountCommunitySummaryResilient] count path", e2);
      return emptySummary();
    }
  }
}
