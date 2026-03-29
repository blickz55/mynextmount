-- CreateTable
CREATE TABLE "MountListingCommunityAggregate" (
    "spellId" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL,
    "sumValues" INTEGER NOT NULL,
    "listingHelpfulnessScore" INTEGER NOT NULL,
    "communitySignalSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MountListingCommunityAggregate_pkey" PRIMARY KEY ("spellId")
);

-- Backfill from existing votes (v1: sum = helpfulness score)
INSERT INTO "MountListingCommunityAggregate" (
    "spellId",
    "voteCount",
    "sumValues",
    "listingHelpfulnessScore",
    "communitySignalSchemaVersion",
    "updatedAt"
)
SELECT
    "spellId",
    COUNT(*)::INTEGER,
    COALESCE(SUM("value"), 0)::INTEGER,
    COALESCE(SUM("value"), 0)::INTEGER,
    1,
    NOW()
FROM "MountListingVote"
GROUP BY "spellId";
