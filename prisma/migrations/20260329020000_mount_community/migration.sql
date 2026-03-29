-- Mount listing community: comments, votes, admin alert throttle
CREATE TABLE "MountComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spellId" INTEGER NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MountComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MountListingVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spellId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MountListingVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MountListingAlertSent" (
    "spellId" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MountListingAlertSent_pkey" PRIMARY KEY ("spellId")
);

CREATE INDEX "MountComment_spellId_createdAt_idx" ON "MountComment"("spellId", "createdAt");

CREATE INDEX "MountListingVote_spellId_idx" ON "MountListingVote"("spellId");

CREATE UNIQUE INDEX "MountListingVote_userId_spellId_key" ON "MountListingVote"("userId", "spellId");

ALTER TABLE "MountComment" ADD CONSTRAINT "MountComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MountListingVote" ADD CONSTRAINT "MountListingVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
