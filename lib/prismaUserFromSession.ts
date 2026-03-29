import { prisma } from "@/lib/prisma";

const USER_ACCOUNT_SELECT = {
  id: true,
  email: true,
  collectionSpellIds: true,
  collectionUpdatedAt: true,
} as const;

export type AppUserAccountRow = {
  id: string;
  email: string;
  collectionSpellIds: string;
  collectionUpdatedAt: Date | null;
};

/**
 * Resolve the DB user for an authenticated session. Prefer JWT `sub` (user id);
 * if it is missing or invalid, fall back to email so legacy or odd tokens still work.
 * Avoids Prisma validation errors from `findUnique({ id: "" })`.
 */
export async function findAppUserFromSession(sessionUser: {
  id?: string | null;
  email?: string | null;
}): Promise<AppUserAccountRow | null> {
  const id =
    typeof sessionUser.id === "string" && sessionUser.id.trim() !== ""
      ? sessionUser.id.trim()
      : "";
  const email =
    typeof sessionUser.email === "string" && sessionUser.email.trim() !== ""
      ? sessionUser.email.trim().toLowerCase()
      : "";

  if (!id && !email) {
    return null;
  }

  if (id) {
    try {
      const byId = await prisma.user.findUnique({
        where: { id },
        select: USER_ACCOUNT_SELECT,
      });
      if (byId) {
        return byId;
      }
    } catch {
      /* malformed id in token — fall through to email */
    }
  }

  if (email) {
    return prisma.user.findUnique({
      where: { email },
      select: USER_ACCOUNT_SELECT,
    });
  }

  return null;
}

export function sessionHasDbIdentity(sessionUser: {
  id?: string | null;
  email?: string | null;
}): boolean {
  const id =
    typeof sessionUser.id === "string" && sessionUser.id.trim() !== ""
      ? sessionUser.id.trim()
      : "";
  const email =
    typeof sessionUser.email === "string" && sessionUser.email.trim() !== ""
      ? sessionUser.email.trim()
      : "";
  return Boolean(id || email);
}
