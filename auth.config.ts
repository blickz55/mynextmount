import type { NextAuthConfig } from "next-auth";

/**
 * Options shared with Edge middleware. Keep heavy providers (Credentials + Prisma +
 * bcrypt) only in auth.ts so middleware stays under Vercel’s 1 MB Edge limit.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" as const, maxAge: 30 * 24 * 60 * 60 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        if (token.email && typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
