"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SiteMissionStatement } from "@/components/SiteMissionStatement";

type Props = {
  brandLogoUrl: string;
  /** Optional line above the title (e.g. coming-soon eyebrow). */
  eyebrow?: ReactNode;
  /** Stylized mission to the right of the logo block (home + tool). */
  showMission?: boolean;
  /**
   * Hero banner from `data/images/highlight image.*` (copied to public at build).
   */
  highlightBannerUrl?: string;
};

/**
 * Logo + title + tagline link home — Epic H.2. Optional highlight banner + mission.
 */
export function SiteBrand({
  brandLogoUrl,
  eyebrow,
  showMission = false,
  highlightBannerUrl = "",
}: Props) {
  const hasMission = showMission;
  const hasBanner = highlightBannerUrl.trim() !== "";
  return (
    <header
      className={
        hasMission ? "site-brand site-brand--with-mission" : "site-brand"
      }
      aria-label="MyNextMount"
    >
      {hasBanner ? (
        <div className="site-brand__banner-wrap">
          <img
            className="site-brand__banner"
            src={highlightBannerUrl.trim()}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        </div>
      ) : null}
      <div className="site-brand__row">
        <Link href="/" className="site-brand__home">
          {brandLogoUrl !== "" && (
            <img
              className="site-brand__logo"
              src={brandLogoUrl}
              alt=""
              decoding="async"
              loading="lazy"
            />
          )}
          {eyebrow}
          <h1 className="site-title">
            My<span className="site-title-accent">Next</span>Mount
          </h1>
          <p className="site-tagline">What to farm next — mynextmount.com</p>
        </Link>
        {hasMission ? (
          <div className="site-brand__mission-wrap">
            <SiteMissionStatement />
          </div>
        ) : null}
      </div>
    </header>
  );
}
