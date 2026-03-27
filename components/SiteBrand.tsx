"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  brandLogoUrl: string;
  /** Optional line above the title (e.g. coming-soon eyebrow). */
  eyebrow?: ReactNode;
  /** Optional pitch to the right of the logo/title block (home + tool). */
  mission?: string;
};

/**
 * Logo + title + tagline link home — Epic H.2. Optional `mission` sits to the right on wide viewports.
 */
export function SiteBrand({ brandLogoUrl, eyebrow, mission }: Props) {
  const hasMission = mission != null && mission.trim() !== "";
  return (
    <header
      className={
        hasMission ? "site-brand site-brand--with-mission" : "site-brand"
      }
      aria-label="MyNextMount"
    >
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
          <p className="site-brand__mission">{mission}</p>
        ) : null}
      </div>
    </header>
  );
}
