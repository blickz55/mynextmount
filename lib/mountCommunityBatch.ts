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
