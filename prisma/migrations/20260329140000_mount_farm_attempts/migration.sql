-- Epic K.2 — farm attempt counters per user + spell
CREATE TABLE "MountFarmAttempt" (
    "userId" TEXT NOT NULL,
    "spellId" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "MountFarmAttempt_pkey" PRIMARY KEY ("userId","spellId")
);

CREATE INDEX "MountFarmAttempt_userId_idx" ON "MountFarmAttempt"("userId");

ALTER TABLE "MountFarmAttempt" ADD CONSTRAINT "MountFarmAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
