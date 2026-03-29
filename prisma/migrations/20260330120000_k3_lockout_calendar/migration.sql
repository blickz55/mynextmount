-- CreateEnum
CREATE TYPE "WeeklyResetCalendar" AS ENUM ('AMERICAS_OCEANIA', 'EUROPE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "weeklyResetCalendar" "WeeklyResetCalendar" NOT NULL DEFAULT 'AMERICAS_OCEANIA';

-- CreateTable
CREATE TABLE "MountLockoutCompletion" (
    "userId" TEXT NOT NULL,
    "spellId" INTEGER NOT NULL,
    "lastCompletedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MountLockoutCompletion_pkey" PRIMARY KEY ("userId","spellId")
);

-- CreateIndex
CREATE INDEX "MountLockoutCompletion_userId_idx" ON "MountLockoutCompletion"("userId");

-- AddForeignKey
ALTER TABLE "MountLockoutCompletion" ADD CONSTRAINT "MountLockoutCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
