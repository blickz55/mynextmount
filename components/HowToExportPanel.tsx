"use client";

import Link from "next/link";
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
    <section className="how-to-panel" aria-label="Getting started">
      <h2 className="how-to-panel__title">Getting Started</h2>
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
          <h3 className="how-to-step__heading how-to-step__heading--install">
            Install MyNextMount
          </h3>
          <p className="how-to-step__text">
            Install using{" "}
            <a
              href={addonListingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="how-to-step__link"
            >
              {listingLabel}
            </a>
            <br />
            <br />
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
        <div className="how-to-step how-to-step--slash">
          <h3 className="how-to-step__heading how-to-step__heading--slash">
            Type /mnm in game
          </h3>
          <p className="how-to-step__sub">or /mynextmount</p>
        </div>
        <div className="how-to-step how-to-step--paste">
          <h3 className="how-to-step__heading">Paste Output Below</h3>
          <span className="how-to-step__arrow" aria-hidden>
            ↓
          </span>
        </div>
      </div>
      <p className="how-to-panel__catalog-note">
        <Link
          href="/tool/retail-unobtainable"
          className="how-to-panel__catalog-note-link"
        >
          Retail unobtainable list
        </Link>
        <span className="how-to-panel__catalog-note-muted">
          {" "}
          — catalog reference (legacy / removed vendors, etc.)
        </span>
      </p>
    </section>
  );
}

/**
 * Short reminder for signed-in users replacing their saved collection — links to full steps.
 */
export function HowToExportCompact() {
  const listingLabel = listingLinkLabel(addonListingUrl);

  return (
    <div className="how-to-compact" aria-label="Addon export reminder">
      <p className="how-to-compact__text">
        In game, run <strong>/mnm</strong> (or <strong>/mynextmount</strong>) and
        copy the whole line the addon prints. Install from{" "}
        <a
          href={addonListingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="how-to-compact__link"
        >
          {listingLabel}
        </a>
        {" · "}
        <a
          href={ADDON_INSTALL_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="how-to-compact__link"
        >
          Manual install
        </a>
        .
      </p>
    </div>
  );
}
