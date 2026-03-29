import { prisma } from "@/lib/prisma";
import { sendMountListingNegativeAlertEmail } from "@/lib/sendMountListingNegativeAlertEmail";

const COOLDOWN_MS = 48 * 3600 * 1000;

/**
 * If the mount has ≥2 downvotes and 0 upvotes, email the admin (throttled).
 * When any upvote exists, clear throttle so a future bad spell can alert again.
 */
export async function maybeNotifyAdminNegativeListingFeedback(
  spellId: number,
  mountName: string,
): Promise<void> {
  const admin = process.env.ADMIN_ALERT_EMAIL?.trim();
  if (!admin) return;

  const [upCount, downCount] = await Promise.all([
    prisma.mountListingVote.count({ where: { spellId, value: 1 } }),
    prisma.mountListingVote.count({ where: { spellId, value: -1 } }),
  ]);

  if (upCount > 0) {
    await prisma.mountListingAlertSent.deleteMany({ where: { spellId } });
    return;
  }

  if (downCount < 2) return;

  const prev = await prisma.mountListingAlertSent.findUnique({
    where: { spellId },
  });
  if (prev && Date.now() - prev.sentAt.getTime() < COOLDOWN_MS) {
    return;
  }

  try {
    await sendMountListingNegativeAlertEmail({
      to: admin,
      spellId,
      mountName,
      upCount,
      downCount,
    });
  } catch (e) {
    console.error("[mountCommunityAlert] send email", e);
    return;
  }

  await prisma.mountListingAlertSent.upsert({
    where: { spellId },
    create: { spellId },
    update: { sentAt: new Date() },
  });
}
