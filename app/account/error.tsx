"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ShellTopbar } from "@/components/ShellTopbar";
import { SiteBrand } from "@/components/SiteBrand";

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
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
      <SiteBrand brandLogoUrl={brandLogoUrl} />
      <h1 className="section-title">Couldn&apos;t load your collection</h1>
      <p className="lead">
        Something went wrong on the server. You can try again, or go back to the
        tool.
      </p>
      {error.digest != null && error.digest !== "" && (
        <p className="field-hint">Reference: {error.digest}</p>
      )}
      <p className="status-block">
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Try again
        </button>
        {" · "}
        <Link href="/tool">Back to tool</Link>
        {" · "}
        <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
