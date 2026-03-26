import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Session/JWT only — no Credentials / Prisma / bcrypt. Use in RSC and APIs that
 * only need the signed-in user, so bundles stay smaller and Edge-adjacent code
 * stays predictable.
 */
export const { auth } = NextAuth(authConfig);
