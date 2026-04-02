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
    "MyNextMount — early alpha WoW mount helper: paste /mnm, see what to farm next, with quick tips and links.",
  openGraph: {
    title: "MyNextMount — early alpha",
    description:
      "Still rough. Paste your addon line, get farm ideas, filters, and guides.",
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
          The site&apos;s half-baked on purpose — we ship fast, fix fast. Expect
          janky UI and weird bugs. Thanks for poking it while we build.
        </p>
      </aside>

      <section
        className="how-to-panel coming-soon-pitch"
        aria-label="What MyNextMount is"
      >
        <h2 className="how-to-panel__title">What this is</h2>
        <p className="coming-soon-lead">
          You tell us what you <strong>already own</strong>; we point at stuff
          you <strong>don&apos;t</strong>, with filters, short tips, Wowhead
          links, and player comments where we have them.
        </p>
        <p className="coming-soon-lead">
          In game, <strong>/mnm</strong> on the <strong>MyNextMount</strong>{" "}
          addon copies one line — paste it here. We never farm-suggest mounts
          sitting in your line. Tick boxes for drops, vendors, holidays, shop,
          whatever you care about.
        </p>
        <p className="coming-soon-lead">
          Grab the addon from the{" "}
          <a
            href={addonListingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            listing
          </a>{" "}
          or{" "}
          <a
            href={ADDON_INSTALL_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            install it by hand
          </a>
          .
        </p>
        <p className="coming-soon-lead coming-soon-lead--last">
          The real homepage is still the tool — this page is the “hi, we exist”
          stub.
        </p>
      </section>

      <section
        className="content-section coming-soon-actions"
        aria-label="Join the beta or learn more"
      >
        <h2 className="section-title">Jump in</h2>
        <p className="section-intro">
          <strong>Closed beta</strong> — free account, paste your{" "}
          <code className="inline-code">M:…</code> line, get a sorted farm list
          and filters.
        </p>
        <p className="coming-soon-cta-row">
          <Link href="/beta" className="btn-primary coming-soon-cta">
            Beta signup
          </Link>
        </p>
      </section>
    </main>
  );
}
