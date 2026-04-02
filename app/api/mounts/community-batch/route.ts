import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  MOUNT_COMMUNITY_BATCH_MAX,
} from "@/lib/mountCommunityConstants";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";
import { loadMountCommunitySummaries } from "@/lib/mountCommunityBatch";

export const runtime = "nodejs";

function normalizeSpellIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const x of raw) {
    const n = Number(x);
    if (!Number.isFinite(n) || n < 1 || n > 2 ** 31 - 1) continue;
    const k = Math.floor(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MOUNT_COMMUNITY_BATCH_MAX) break;
  }
  return out;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const spellIds = normalizeSpellIds(
    (body as { spellIds?: unknown }).spellIds,
  );
  const session = await auth();
  let userId: string | undefined;
  if (session?.user && sessionHasDbIdentity(session.user)) {
    const u = await findAppUserFromSession(session.user);
    userId = u?.id;
  }

  try {
    const summaries = await loadMountCommunitySummaries(spellIds, userId);
    return NextResponse.json({ summaries });
  } catch (e) {
    console.error("[api/mounts/community-batch]", e);
    const fallback: Record<
      string,
      {
        commentCount: number;
        upCount: number;
        downCount: number;
        myVote: null | 1 | -1;
      }
    > = {};
    for (const id of spellIds) {
      fallback[String(id)] = {
        commentCount: 0,
        upCount: 0,
        downCount: 0,
        myVote: null,
      };
    }
    return NextResponse.json({ summaries: fallback });
  }
}
