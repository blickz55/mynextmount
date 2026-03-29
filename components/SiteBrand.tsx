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
  /** Hero banner from `highlight image text.*` or `highlight image.*` at build. */
  highlightBannerUrl?: string;
  /**
   * Where the logo / hero title navigates (default `/`). Use `/tool` or `/` from
   * SmartSiteBrand or server props when auth + saved collection should change home.
   */
  homeHref?: string;
};

/**
 * Logo + title + tagline link home — Epic H.2. Optional highlight banner + mission.
 */
export function SiteBrand({
  brandLogoUrl,
  eyebrow,
  showMission = false,
  highlightBannerUrl = "",
  homeHref = "/",
}: Props) {
  const home = homeHref.trim() || "/";
  const hasMission = showMission;
  const hasBanner = highlightBannerUrl.trim() !== "";
  const showLogo = brandLogoUrl !== "" && !hasBanner;

  const headerClass =
    hasBanner && hasMission
      ? "site-brand site-brand--hero site-brand--with-mission"
      : hasMission
        ? "site-brand site-brand--with-mission"
        : "site-brand";

  const titleHeading = (
    <h1 className="site-title">
      My<span className="site-title-accent">Next</span>Mount
    </h1>
  );
  const titleBlockDefault = (
    <>
      {titleHeading}
      <p className="site-tagline">What to farm next — mynextmount.com</p>
    </>
  );

  return (
    <header className={headerClass} aria-label="MyNextMount">
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

      {hasBanner ? (
        <div className="site-brand__hero-stack">
          <Link href={home} className="site-brand__home site-brand__home--hero">
            {titleHeading}
          </Link>
          {hasMission ? (
            <div className="site-brand__mission-wrap site-brand__mission-wrap--hero">
              <SiteMissionStatement />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="site-brand__row">
          <Link href={home} className="site-brand__home">
            {showLogo ? (
              <img
                className="site-brand__logo"
                src={brandLogoUrl}
                alt=""
                decoding="async"
                loading="lazy"
              />
            ) : null}
            {eyebrow}
            {titleBlockDefault}
          </Link>
          {hasMission ? (
            <div className="site-brand__mission-wrap">
              <SiteMissionStatement />
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}
