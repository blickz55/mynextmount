import Link from "next/link";
import type { Metadata } from "next";
import { ShellTopbar } from "@/components/ShellTopbar";
import { SmartSiteBrand } from "@/components/SmartSiteBrand";
import { ADDON_INSTALL_DOCS_URL, getAddonListingUrl } from "@/lib/addonListing";

const brandLogoUrl =
  typeof process.env.NEXT_PUBLIC_BRAND_LOGO_URL === "string"
    ? process.env.NEXT_PUBLIC_BRAND_LOGO_URL.trim()
    : "";

const highlightBannerUrl =
  typeof process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL === "string"
    ? process.env.NEXT_PUBLIC_HIGHLIGHT_BANNER_URL.trim()
    : "";

const addonListingUrl = getAddonListingUrl();

export const metadata: Metadata = {
  title: "Coming soon",
  description:
    "Early alpha: MyNextMount is a World of Warcraft mount helper still in active development — we’re building toward a tool that’s useful for every collector. Farm suggestions from what you own, guides, and an in-game export addon.",
  openGraph: {
    title: "MyNextMount — early alpha",
    description:
      "We’re in early alpha and still building. A mount farming companion: know what to farm next from your collection, with guides and a WoW addon export.",
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
      <ShellTopbar />
      <SmartSiteBrand
        brandLogoUrl={brandLogoUrl}
        showMission
        highlightBannerUrl={highlightBannerUrl}
      />

      <aside
        className="home-alpha-callout"
        aria-label="Product development stage"
      >
        <p className="home-alpha-callout__eyebrow">Early alpha</p>
        <p className="home-alpha-callout__body">
          You&apos;re seeing MyNextMount while it&apos;s still rough around the
          edges. We&apos;re shipping and iterating so the product becomes
          genuinely useful for <strong>every</strong> mount collector—not just
          early testers. Expect changes, missing polish, and the occasional bug;
          we appreciate everyone who tries it while we build.
        </p>
      </aside>

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
        aria-label="Join the beta or learn more"
      >
        <h2 className="section-title">Try the recommender</h2>
        <p className="section-intro">
          We&apos;re running a <strong>closed beta</strong>: create a free
          account, then paste your{" "}
          <code className="inline-code">M:…</code> export from the in-game addon
          to see personalized farm suggestions, filters, and guides.
        </p>
        <p className="coming-soon-cta-row">
          <Link href="/beta" className="btn-primary coming-soon-cta">
            Sign up for Beta
          </Link>
        </p>
      </section>
    </main>
  );
}
