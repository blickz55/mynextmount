"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ShellTopbar } from "@/components/ShellTopbar";
import { SmartSiteBrand } from "@/components/SmartSiteBrand";

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

const highlightBannerUrl =
  typeof process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL === "string"
    ? process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL.trim()
    : "";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[account/error]", error);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="app-main app-shell">
      <ShellTopbar />
      <SmartSiteBrand
        brandLogoUrl={brandLogoUrl}
        showMission
        highlightBannerUrl={highlightBannerUrl}
      />
      <h1 className="section-title">Couldn&apos;t load your collection</h1>
      <p className="lead">
        Something went wrong while rendering My Mounts. This is usually a brief
        server hiccup — your saved spell list is still in the database if you had
        saved one before.
      </p>
      {error.digest != null && error.digest !== "" && (
        <p className="field-hint">Reference: {error.digest}</p>
      )}
      <p className="status-block">
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Try again
        </button>
        {" · "}
        <Link href="/account">Reload My Mounts</Link>
        {" · "}
        <Link href="/tool">Back to tool</Link>
        {" · "}
        <Link href="/login">Sign in</Link>
      </p>
      <p className="field-hint">
        If Try again keeps failing, use Reload My Mounts (full navigation) or
        open the tool — you can always paste from the addon or use{" "}
        <strong>Sync from account</strong> after signing in.
      </p>
    </main>
  );
}
