-- Epic K.1 — historical collection snapshots per user
CREATE TABLE "MountCollectionSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spellIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MountCollectionSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MountCollectionSnapshot_userId_createdAt_idx" ON "MountCollectionSnapshot"("userId", "createdAt" DESC);

ALTER TABLE "MountCollectionSnapshot" ADD CONSTRAINT "MountCollectionSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
