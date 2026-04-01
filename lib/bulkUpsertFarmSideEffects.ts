import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/**
 * Epic K.2 side effects on collection save: bump farm-try counts and touch lockout rows.
 * One INSERT…ON CONFLICT per table (via unnest) instead of dozens of sequential upserts,
 * so serverless + pooler stay under interactive transaction timeouts.
 */
export async function bulkUpsertFarmSideEffects(
  tx: Pick<PrismaClient, "$executeRaw">,
  params: {
    userId: string;
    targetIds: readonly number[];
    lockoutSpellIds: readonly number[];
    now: Date;
  },
): Promise<void> {
  const { userId, targetIds, lockoutSpellIds, now } = params;
  const uniqueTargets = [...new Set(targetIds)];
  if (uniqueTargets.length === 0) return;

  await tx.$executeRaw`
    INSERT INTO "MountFarmAttempt" ("userId", "spellId", "attempts", "lastAttemptAt")
    SELECT ${userId}::text, s.spell_id, 1, ${now}
    FROM unnest(ARRAY[${Prisma.join(uniqueTargets)}]::int[]) AS s(spell_id)
    ON CONFLICT ("userId", "spellId") DO UPDATE SET
      "attempts" = "MountFarmAttempt"."attempts" + 1,
      "lastAttemptAt" = EXCLUDED."lastAttemptAt"
  `;

  const uniqueLockouts = [...new Set(lockoutSpellIds)];
  if (uniqueLockouts.length === 0) return;

  await tx.$executeRaw`
    INSERT INTO "MountLockoutCompletion" ("userId", "spellId", "lastCompletedAt")
    SELECT ${userId}::text, s.spell_id, ${now}
    FROM unnest(ARRAY[${Prisma.join(uniqueLockouts)}]::int[]) AS s(spell_id)
    ON CONFLICT ("userId", "spellId") DO UPDATE SET
      "lastCompletedAt" = EXCLUDED."lastCompletedAt"
  `;
}
