import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";
import { loadMountCommunitySummaries } from "@/lib/mountCommunityBatch";
import {
  MOUNT_COMMENT_MAX_LENGTH,
  MOUNT_COMMENTS_PAGE_SIZE,
} from "@/lib/mountCommunityConstants";

export const runtime = "nodejs";

function parseSpellId(param: string): number | null {
  const n = Number(param);
  if (!Number.isFinite(n) || n < 1 || n > 2 ** 31 - 1) return null;
  return Math.floor(n);
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ spellId: string }> },
) {
  const { spellId: raw } = await ctx.params;
  const spellId = parseSpellId(raw);
  if (spellId === null) {
    return NextResponse.json({ error: "Invalid spell id" }, { status: 400 });
  }

  const session = await auth();
  let userId: string | null = null;
  if (session?.user && sessionHasDbIdentity(session.user)) {
    const u = await findAppUserFromSession(session.user);
    userId = u?.id ?? null;
  }

  const defaultSummary = {
    commentCount: 0,
    upCount: 0,
    downCount: 0,
    myVote: null as null | 1 | -1,
  };

  let rows: {
    id: string;
    body: string;
    createdAt: Date;
    userId: string;
  }[] = [];
  try {
    rows = await prisma.mountComment.findMany({
      where: { spellId },
      orderBy: { createdAt: "desc" },
      take: MOUNT_COMMENTS_PAGE_SIZE,
      select: {
        id: true,
        body: true,
        createdAt: true,
        userId: true,
      },
    });
  } catch (e) {
    console.error("[api/mounts/.../comments GET] mountComment.findMany", e);
    rows = [];
  }

  let summary = defaultSummary;
  try {
    const summaryMap = await loadMountCommunitySummaries(
      [spellId],
      userId ?? undefined,
    );
    summary = summaryMap[spellId] ?? defaultSummary;
  } catch (e) {
    console.error("[api/mounts/.../comments GET] loadMountCommunitySummaries", e);
    summary = {
      ...defaultSummary,
      commentCount: rows.length,
    };
  }

  return NextResponse.json({
    comments: rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      isYou: userId !== null && r.userId === userId,
    })),
    summary,
  });
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
    const row = await prisma.mountComment.create({
      data: {
        userId: dbUser.id,
        spellId,
        body: text,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        userId: true,
      },
    });

    const summaryMap = await loadMountCommunitySummaries(
      [spellId],
      dbUser.id,
    );
    const summary = summaryMap[spellId];

    return NextResponse.json({
      comment: {
        id: row.id,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        isYou: true,
      },
      summary,
    });
  } catch (e) {
    console.error("[api/mounts/.../comments POST]", e);
    return NextResponse.json(
      { error: "Could not save comment." },
      { status: 500 },
    );
  }
}
