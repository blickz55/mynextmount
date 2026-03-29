import type { PrismaClient } from "@prisma/client";

const SCHEMA_V1 = 1;

/**
 * Recompute Epic K.8 aggregate for one mount from `MountListingVote` rows.
 * Call after vote create/update/delete.
 */
export async function refreshMountListingCommunityAggregate(
  prisma: PrismaClient,
  spellId: number,
): Promise<void> {
  const agg = await prisma.mountListingVote.aggregate({
    where: { spellId },
    _count: true,
    _sum: { value: true },
  });
  const voteCount = agg._count;
  const sumValues = agg._sum.value ?? 0;
  if (voteCount === 0) {
    await prisma.mountListingCommunityAggregate.deleteMany({
      where: { spellId },
    });
    return;
  }
  await prisma.mountListingCommunityAggregate.upsert({
    where: { spellId },
    create: {
      spellId,
      voteCount,
      sumValues,
      listingHelpfulnessScore: sumValues,
      communitySignalSchemaVersion: SCHEMA_V1,
    },
    update: {
      voteCount,
      sumValues,
      listingHelpfulnessScore: sumValues,
      communitySignalSchemaVersion: SCHEMA_V1,
    },
  });
}
