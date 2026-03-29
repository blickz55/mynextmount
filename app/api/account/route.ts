import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  parseWeeklyResetCalendarInput,
  weeklyResetCalendarToApi,
} from "@/lib/parseWeeklyResetCalendar";
import { prisma } from "@/lib/prisma";
import {
  findAppUserFromSession,
  sessionHasDbIdentity,
} from "@/lib/prismaUserFromSession";

export const runtime = "nodejs";

/** Epic K.3 — update weekly lockout calendar (`weeklyResetCalendar` JSON body). */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || !sessionHasDbIdentity(session.user)) {
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
  const raw = (body as { weeklyResetCalendar?: unknown }).weeklyResetCalendar;
  const cal = parseWeeklyResetCalendarInput(raw);
  if (!cal) {
    return NextResponse.json(
      {
        error:
          "weeklyResetCalendar must be \"americas_oceania\" or \"europe\"",
      },
      { status: 400 },
    );
  }

  try {
    const user = await findAppUserFromSession(session.user);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { weeklyResetCalendar: cal },
    });
    return NextResponse.json({
      ok: true,
      weeklyResetCalendar: weeklyResetCalendarToApi(cal),
    });
  } catch (e) {
    console.error("[api/account PATCH]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

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
