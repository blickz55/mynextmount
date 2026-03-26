"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/** Default production GA4 property; override with NEXT_PUBLIC_GA_MEASUREMENT_ID. */
const DEFAULT_MEASUREMENT_ID = "G-W7BYTKR21X";

function measurementId(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (fromEnv === "" || fromEnv === "0" || fromEnv?.toLowerCase() === "false") {
    return null;
  }
  return fromEnv || DEFAULT_MEASUREMENT_ID;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function GoogleAnalyticsInner({ id }: { id: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    window.gtag?.("event", "page_view", {
      page_path: path,
      page_title: typeof document !== "undefined" ? document.title : undefined,
      page_location: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }, [pathname, searchParams, id]);

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
      <Suspense fallback={null}>
        <GoogleAnalyticsInner id={id} />
      </Suspense>
    </>
  );
}
