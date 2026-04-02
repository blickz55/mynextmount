import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMountCommunitySummaryResilient } from "@/lib/mountCommunityBatch";
import { MOUNT_COMMENT_MAX_LENGTH } from "@/lib/mountCommunityConstants";
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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ spellId: string; commentId: string }> },
) {
  const { spellId: rawSpell, commentId } = await ctx.params;
  const spellId = parseSpellId(rawSpell);
  if (spellId === null) {
    return NextResponse.json({ error: "Invalid spell id" }, { status: 400 });
  }
  if (
    typeof commentId !== "string" ||
    commentId.trim() === "" ||
    commentId.length > 80
  ) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
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
  const text = String((body as { body?: unknown }).body ?? "").trim();
  if (text.length < 1) {
    return NextResponse.json({ error: "Comment is empty." }, { status: 400 });
  }
  if (text.length > MOUNT_COMMENT_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Comment is too long (max ${MOUNT_COMMENT_MAX_LENGTH}).` },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.mountComment.findFirst({
      where: {
        id: commentId.trim(),
        spellId,
        userId: dbUser.id,
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Comment not found or not yours." },
        { status: 404 },
      );
    }

    const row = await prisma.mountComment.update({
      where: { id: existing.id },
      data: { body: text },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    const summary = await getMountCommunitySummaryResilient(spellId, dbUser.id);

    return NextResponse.json({
      comment: {
        id: row.id,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        isYou: true,
      },
      summary,
    });
  } catch (e) {
    console.error("[api/mounts/.../comments/... PATCH]", e);
    return NextResponse.json(
      { error: "Could not update comment." },
      { status: 500 },
    );
  }
}
