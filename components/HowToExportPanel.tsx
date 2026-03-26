"use client";

import {
  ADDON_INSTALL_DOCS_URL,
  getAddonListingUrl,
  getHowToDemoUrl,
} from "@/lib/addonListing";

const addonListingUrl = getAddonListingUrl();
const howToDemoUrl = getHowToDemoUrl();

/**
 * Epic I.3 — How To: install → slash command → copy/paste, with OS-aware shortcuts
 * and optional demo video link.
 */
export function HowToExportPanel() {
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
      <ol className="how-to-panel__list">
        <li>
          Install <strong>MyNextMount</strong> from the{" "}
          <a
            href={addonListingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            public addon listing
          </a>{" "}
          (CurseForge / Wago / your installer). For a folder copy from this
          repo, see{" "}
          <a
            href={ADDON_INSTALL_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            manual install
          </a>
          .
          <details className="how-to-panel__paths">
            <summary>Where is my AddOns folder?</summary>
            <ul className="how-to-panel__paths-list">
              <li>
                <strong>Windows:</strong> inside your WoW install,{" "}
                <code className="how-to-panel__cmd">
                  _retail_\Interface\AddOns\
                </code>{" "}
                (put the <code className="how-to-panel__cmd">MyNextMount</code>{" "}
                folder there).
              </li>
              <li>
                <strong>Mac:</strong>{" "}
                <code className="how-to-panel__cmd">
                  ~/Library/Application Support/Blizzard/World of Warcraft/_retail_/Interface/AddOns/
                </code>
              </li>
            </ul>
          </details>
        </li>
        <li>
          Launch WoW and enable <strong>MyNextMount</strong> on the AddOns list
          (<strong>Esc</strong> → <strong>Options</strong> →{" "}
          <strong>AddOns</strong> on both Windows and Mac).
        </li>
        <li>
          Type <code className="how-to-panel__cmd">/mountexport</code> or{" "}
          <code className="how-to-panel__cmd">/mynextmount</code> into your
          chat bar, then press <strong>Enter</strong>.
        </li>
        <li>
          In the in-game pop-up, select all (
          <kbd className="how-to-panel__kbd">Ctrl</kbd>+
          <kbd className="how-to-panel__kbd">A</kbd> on Windows,{" "}
          <kbd className="how-to-panel__kbd">⌘</kbd>+
          <kbd className="how-to-panel__kbd">A</kbd> on Mac), copy (
          <kbd className="how-to-panel__kbd">Ctrl</kbd>+
          <kbd className="how-to-panel__kbd">C</kbd> or{" "}
          <kbd className="how-to-panel__kbd">⌘</kbd>+
          <kbd className="how-to-panel__kbd">C</kbd>), then paste into the box
          below (
          <kbd className="how-to-panel__kbd">Ctrl</kbd>+
          <kbd className="how-to-panel__kbd">V</kbd> or{" "}
          <kbd className="how-to-panel__kbd">⌘</kbd>+
          <kbd className="how-to-panel__kbd">V</kbd>
          ). The string looks like{" "}
          <code className="how-to-panel__cmd">M:65645,59961,41256</code>.
        </li>
      </ol>
    </section>
  );
}
