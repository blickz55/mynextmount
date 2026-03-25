"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  brandLogoUrl: string;
  /** Optional line above the title (e.g. coming-soon eyebrow). */
  eyebrow?: ReactNode;
};

/**
 * Entire brand block (logo + title + tagline) links home — Epic H.2.
 */
export function SiteBrand({ brandLogoUrl, eyebrow }: Props) {
  return (
    <header className="site-brand" aria-label="MyNextMount">
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
    </header>
  );
}
