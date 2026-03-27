"use client";

import {
  ADDON_INSTALL_DOCS_URL,
  getAddonListingUrl,
  getHowToDemoUrl,
} from "@/lib/addonListing";

const addonListingUrl = getAddonListingUrl();
const howToDemoUrl = getHowToDemoUrl();

function listingLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("curseforge")) return "CurseForge";
    if (host.includes("wago")) return "Wago";
  } catch {
    /* ignore */
  }
  return "Addon listing";
}

/**
 * Three-step export path: install → slash command → paste below.
 */
export function HowToExportPanel() {
  const listingLabel = listingLinkLabel(addonListingUrl);

  return (
    <section className="how-to-panel" aria-label="How to export your mounts">
      <h2 className="how-to-panel__title">How to get your export</h2>
      {howToDemoUrl ? (
        <p className="how-to-panel__demo">
          <strong>New here?</strong>{" "}
          <a
            href={howToDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="how-to-panel__demo-link"
          >
            Watch a quick walkthrough
          </a>{" "}
          (about a minute — from install through pasting below).
        </p>
      ) : null}
      <div className="how-to-panel__grid">
        <div className="how-to-step">
          <h3 className="how-to-step__heading">Install MyNextMount</h3>
          <p className="how-to-step__text">
            Add it from{" "}
            <a
              href={addonListingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="how-to-step__link"
            >
              {listingLabel}
            </a>
            .{" "}
            <a
              href={ADDON_INSTALL_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="how-to-step__link how-to-step__link--muted"
            >
              Manual install
            </a>
          </p>
        </div>
        <div className="how-to-step">
          <h3 className="how-to-step__heading">Type in chat</h3>
          <p className="how-to-step__text">
            <code className="how-to-panel__cmd">/mynextmount</code> or the
            short alias{" "}
            <code className="how-to-panel__cmd">/mnm</code>
            <span className="how-to-step__fine">
              {" "}
              (also <code className="how-to-panel__cmd">/mountexport</code>)
            </span>
            , then press <strong>Enter</strong>.
          </p>
        </div>
        <div className="how-to-step how-to-step--paste">
          <h3 className="how-to-step__heading">Paste output below</h3>
          <p className="how-to-step__text">
            Copy the <code className="how-to-panel__cmd">M:…</code> line from
            the in-game window into the export field.
          </p>
          <span className="how-to-step__arrow" aria-hidden>
            ↓
          </span>
        </div>
      </div>
    </section>
  );
}
