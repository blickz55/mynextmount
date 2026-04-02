import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { mounts } from "@/lib/mounts";
import { maybeNotifyAdminNegativeListingFeedback } from "@/lib/mountCommunityAlert";
import { getMountCommunitySummaryResilient } from "@/lib/mountCommunityBatch";
import { prisma } from "@/lib/prisma";
import { refreshMountListingCommunityAggregate } from "@/lib/refreshMountListingCommunityAggregate";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";

export const runtime = "nodejs";

function parseSpellId(param: string): number | null {
  const n = Number(param);
  if (!Number.isFinite(n) || n < 1 || n > 2 ** 31 - 1) return null;
  return Math.floor(n);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ spellId: string }> },
) {
  const { spellId: raw } = await ctx.params;
  const spellId = parseSpellId(raw);
  if (spellId === null) {
    return NextResponse.json({ error: "Invalid spell id" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dbUser = await findAppUserFromSession(session.user);
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const valueRaw = (body as { value?: unknown }).value;
  const value =
    valueRaw === 0 || valueRaw === null
      ? 0
      : valueRaw === 1 || valueRaw === -1
        ? valueRaw
        : null;
  if (value === null) {
    return NextResponse.json(
      { error: "value must be 1, -1, or 0 to clear." },
      { status: 400 },
    );
  }

  const userId = dbUser.id;

  try {
    if (value === 0) {
      await prisma.mountListingVote.deleteMany({
        where: { userId, spellId },
      });
    } else {
      await prisma.mountListingVote.upsert({
        where: {
          userId_spellId: { userId, spellId },
        },
        create: { userId, spellId, value },
        update: { value },
      });
    }

    try {
      await refreshMountListingCommunityAggregate(prisma, spellId);
    } catch (aggErr) {
      console.error(
        "[api/mounts/.../vote POST] refreshMountListingCommunityAggregate",
        aggErr,
      );
    }

    const summary = await getMountCommunitySummaryResilient(spellId, userId);

    const mountName =
      mounts.find((m) => m.id === spellId)?.name ?? `Spell ${spellId}`;
    try {
      await maybeNotifyAdminNegativeListingFeedback(spellId, mountName);
    } catch (notifyErr) {
      console.error(
        "[api/mounts/.../vote POST] maybeNotifyAdminNegativeListingFeedback",
        notifyErr,
      );
    }

    return NextResponse.json({ summary });
  } catch (e) {
    console.error("[api/mounts/.../vote POST]", e);
    return NextResponse.json(
      { error: "Could not save vote." },
      { status: 500 },
    );
  }
}
