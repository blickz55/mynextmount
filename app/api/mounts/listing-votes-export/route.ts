import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Full export of listing vote tallies (one row per spell that has ≥1 vote).
 * Persisted in `MountListingVote`; POST `/api/mounts/[spellId]/vote` writes rows.
 *
 * Auth: set `MOUNT_LISTING_VOTES_EXPORT_SECRET` in the environment, then call:
 *   curl -sS -H "Authorization: Bearer YOUR_SECRET" \
 *     "https://your-domain/api/mounts/listing-votes-export"
 * or header `x-mount-listing-votes-export-secret: YOUR_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.MOUNT_LISTING_VOTES_EXPORT_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Export not configured. Set MOUNT_LISTING_VOTES_EXPORT_SECRET in the environment.",
      },
      { status: 503 },
    );
  }

  const authz = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-mount-listing-votes-export-secret");
  const token =
    authz?.startsWith("Bearer ") ? authz.slice(7).trim() : headerSecret?.trim();
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const groups = await prisma.mountListingVote.groupBy({
      by: ["spellId", "value"],
      _count: true,
    });

    const bySpell = new Map<number, { upCount: number; downCount: number }>();
    for (const row of groups) {
      let e = bySpell.get(row.spellId);
      if (!e) {
        e = { upCount: 0, downCount: 0 };
        bySpell.set(row.spellId, e);
      }
      if (row.value === 1) e.upCount = row._count;
      if (row.value === -1) e.downCount = row._count;
    }

    const rows = [...bySpell.entries()]
      .map(([spellId, { upCount, downCount }]) => ({
        spellId,
        upCount,
        downCount,
        net: upCount - downCount,
      }))
      .sort((a, b) => a.spellId - b.spellId);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      rows,
    });
  } catch (e) {
    console.error("[api/mounts/listing-votes-export GET]", e);
    return NextResponse.json(
      { error: "Could not export listing votes." },
      { status: 500 },
    );
  }
}
