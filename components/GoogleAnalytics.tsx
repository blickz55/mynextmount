"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Default production GA4 property; override with NEXT_PUBLIC_GA_MEASUREMENT_ID. */
const DEFAULT_MEASUREMENT_ID = "G-W7BYTKR21X";

/**
 * Explicitly set NEXT_PUBLIC_GA_MEASUREMENT_ID=false|0|off|no|disabled to turn GA off.
 * Empty string is treated as “unset” (uses default) so Vercel placeholders don’t silently disable tracking.
 */
function measurementId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (raw === undefined || raw === null) return DEFAULT_MEASUREMENT_ID;
  const fromEnv = String(raw).trim();
  if (fromEnv === "") return DEFAULT_MEASUREMENT_ID;
  const lower = fromEnv.toLowerCase();
  if (
    lower === "false" ||
    lower === "0" ||
    lower === "off" ||
    lower === "no" ||
    lower === "disabled"
  ) {
    return null;
  }
  return fromEnv;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function GoogleAnalyticsInner({ id }: { id: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname;
    window.gtag?.("event", "page_view", {
      page_path: path,
      page_title: typeof document !== "undefined" ? document.title : undefined,
      page_location: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }, [pathname, id]);

  return null;
}

export function GoogleAnalytics() {
  const id = measurementId();
  if (!id) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${id}', { send_page_view: false });
        `}
      </Script>
      <GoogleAnalyticsInner id={id} />
    </>
  );
}
