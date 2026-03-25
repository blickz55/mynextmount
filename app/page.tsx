import Link from "next/link";
import type { Metadata } from "next";
import { SiteBrand } from "@/components/SiteBrand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ADDON_INSTALL_DOCS_URL, getAddonListingUrl } from "@/lib/addonListing";

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

const addonListingUrl = getAddonListingUrl();

export const metadata: Metadata = {
  title: "Coming soon",
  description:
    "MyNextMount is a World of Warcraft helper that tells you what mounts to farm next from the ones you already own — with clear sources, guides, and an in-game export addon. Public launch is on the way.",
  openGraph: {
    title: "MyNextMount — coming soon",
    description:
      "Know what to farm next from your mount collection. Trustworthy links, step-by-step guidance, and a WoW addon that exports what you own.",
    url: "/",
  },
};

export default function ComingSoonPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="app-main app-shell"
    >
      <div className="shell-topbar">
        <ThemeToggle />
      </div>
      <SiteBrand
        brandLogoUrl={brandLogoUrl}
        eyebrow={<p className="coming-soon-eyebrow">Coming soon</p>}
      />

      <section
        className="how-to-panel coming-soon-pitch"
        aria-label="What MyNextMount is"
      >
        <h2 className="how-to-panel__title">What we&apos;re building</h2>
        <p className="coming-soon-lead">
          A <strong>personal-first</strong> companion for WoW players who care
          about mounts: given the mounts you <strong>already own</strong>, it
          helps you decide <strong>what to farm next</strong> — with
          trustworthy links, short written guidance, and community context
          where it helps.
        </p>
        <p className="coming-soon-lead">
          You&apos;ll paste a one-line export from the in-game{" "}
          <strong>MyNextMount</strong> addon (your collection as summon spell
          IDs). The site never treats something you own as a farming target, and
          you can narrow results by how mounts are obtained (dungeon, vendor,
          achievement, and more).
        </p>
        <p className="coming-soon-lead">
          Install <strong>MyNextMount</strong> from the{" "}
          <a
            href={addonListingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            public listing
          </a>{" "}
          or follow{" "}
          <a
            href={ADDON_INSTALL_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            manual install
          </a>{" "}
          from the repository.
        </p>
        <p className="coming-soon-lead coming-soon-lead--last">
          The full experience is still in active development; we&apos;re
          polishing the tool before we call it the default homepage. Thanks for
          stopping by early.
        </p>
      </section>

      <section
        className="content-section coming-soon-actions"
        aria-label="Try the preview or learn more"
      >
        <h2 className="section-title">Already have an export?</h2>
        <p className="section-intro">
          If you&apos;re using the addon and need to paste your{" "}
          <code className="inline-code">M:…</code> string, the working
          recommender lives on a separate preview URL so early visitors
          aren&apos;t dropped into a work-in-progress main page.
        </p>
        <p className="coming-soon-cta-row">
          <Link href="/tool" className="btn-primary coming-soon-cta">
            Open the recommender (preview)
          </Link>
        </p>
      </section>
    </main>
  );
}
