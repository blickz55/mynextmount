import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";
import { deserializeSpellIds } from "@/lib/savedCollection";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

/**
 * Epic K.1.1.2 — list collection snapshots for the signed-in user (newest first).
 * Query: `limit` (1–200, default 100), `includeSpellIds=1` to embed full ID arrays (larger payload).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findAppUserFromSession(session.user);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const take = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit)))
    : DEFAULT_LIMIT;
  const includeSpellIds = url.searchParams.get("includeSpellIds") === "1";

  try {
    const rows = await prisma.mountCollectionSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, createdAt: true, spellIds: true },
    });

    const snapshots = rows.map((r) => {
      const base = {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        spellCount: deserializeSpellIds(r.spellIds).length,
      };
      if (includeSpellIds) {
        return {
          ...base,
          spellIds: deserializeSpellIds(r.spellIds),
        };
      }
      return base;
    });

    return NextResponse.json({
      snapshots,
      /** Newest = index 0; index 1 is “previous” for paired diff UX. */
      meta: { limit: take, includeSpellIds },
    });
  } catch (e) {
    console.error("[api/collection/snapshots GET]", e);
    return NextResponse.json(
      { error: "Could not load snapshots." },
      { status: 500 },
    );
  }
}
