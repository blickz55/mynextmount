import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";

export const runtime = "nodejs";

/** Delete the signed-in user and all saved data (J.7 / privacy). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const user = await findAppUserFromSession(session.user);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
