import { NextResponse } from "next/server";

import { auth } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Delete the signed-in user and all saved data (J.7 / privacy). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
