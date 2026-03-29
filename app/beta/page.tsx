"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { ShellTopbar } from "@/components/ShellTopbar";
import { SmartSiteBrand } from "@/components/SmartSiteBrand";
import { safeAppCallbackPath } from "@/lib/safeCallbackUrl";

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

const DEFAULT_AFTER_LOGIN = "/tool";

export default function BetaPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeAppCallbackPath(
    searchParams.get("callbackUrl"),
    DEFAULT_AFTER_LOGIN,
  );

  const registerHref = `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  if (status === "loading") {
    return (
      <main id="main-content" tabIndex={-1} className="app-main app-shell">
        <ShellTopbar />
        <SmartSiteBrand brandLogoUrl={brandLogoUrl} />
        <p className="lead">Loading…</p>
      </main>
    );
  }

  if (status === "authenticated") {
    return (
      <main id="main-content" tabIndex={-1} className="app-main app-shell">
        <ShellTopbar />
        <SmartSiteBrand brandLogoUrl={brandLogoUrl} />
        <p className="lead">Taking you to the tool…</p>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="app-main app-shell">
      <ShellTopbar />
      <SmartSiteBrand brandLogoUrl={brandLogoUrl} />
      <h1 className="section-title">Sign up for Beta</h1>
      <p className="lead">
        The mount recommender is in <strong>closed beta</strong>. Create a free
        account (email and password) to access the tool: paste your{" "}
        <code className="inline-code">M:…</code> export, filter by source, and
        see what to farm next—with guides, community context, and optional
        cloud save for your collection.
      </p>
      <p className="section-intro">
        Already enrolled? Sign in with the same email you used to register.
      </p>
      <div className="coming-soon-cta-row">
        <Link href={registerHref} className="btn-primary coming-soon-cta">
          Create your beta account
        </Link>
      </div>
      <p className="status-block">
        <Link href={loginHref}>Sign in</Link>
        {" · "}
        <Link href="/">Back to home</Link>
      </p>
    </main>
  );
}
