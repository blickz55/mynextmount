"use client";

/**
 * Stylized mission copy (matches Cinzel + gold accents used on the site title).
 */
export function SiteMissionStatement() {
  return (
    <div className="site-mission" role="region" aria-label="About MyNextMount">
      <p className="site-mission__mid">
        Find the mounts that bring you{" "}
        <span className="site-mission__emph">closer</span> to completing yours.
      </p>
    </div>
  );
}
