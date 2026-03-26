import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/account")) {
    const u = new URL("/login", req.nextUrl.origin);
    u.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return Response.redirect(u);
  }
});

export const config = {
  matcher: ["/account", "/account/:path*"],
};
