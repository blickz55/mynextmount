import NextAuth from "next-auth";

import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  if (!req.auth && pathname.startsWith("/account")) {
    const u = new URL("/login", req.nextUrl.origin);
    u.searchParams.set("callbackUrl", `${pathname}${search}`);
    return Response.redirect(u);
  }

  if (!req.auth && (pathname === "/tool" || pathname.startsWith("/tool/"))) {
    const beta = new URL("/beta", req.nextUrl.origin);
    const back = `${pathname}${search}`;
    beta.searchParams.set(
      "callbackUrl",
      back.startsWith("/tool") ? back : "/tool",
    );
    return Response.redirect(beta);
  }
});

export const config = {
  matcher: ["/account", "/account/:path*", "/tool", "/tool/:path*"],
};
