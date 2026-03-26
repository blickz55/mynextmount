import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  deserializeSpellIds,
  MAX_SAVED_SPELL_IDS,
  serializeSpellIds,
} from "@/lib/savedCollection";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { collectionSpellIds: true, collectionUpdatedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const spellIds = deserializeSpellIds(user.collectionSpellIds);
  return NextResponse.json({
    spellIds,
    updatedAt: user.collectionUpdatedAt?.toISOString() ?? null,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
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
  const raw = (body as { spellIds?: unknown }).spellIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "spellIds must be an array" }, { status: 400 });
  }
  if (raw.length > MAX_SAVED_SPELL_IDS) {
    return NextResponse.json(
      { error: `At most ${MAX_SAVED_SPELL_IDS} spell IDs` },
      { status: 400 },
    );
  }
  const nums = raw.map((x) => Number(x)).filter(
    (n) => Number.isFinite(n) && n > 0 && n <= 2 ** 31 - 1,
  );
  const serialized = serializeSpellIds(nums);

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      collectionSpellIds: serialized,
      collectionUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, count: deserializeSpellIds(serialized).length });
}
