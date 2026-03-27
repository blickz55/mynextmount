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
      <p className="site-mission__kicker">
        <span className="site-mission__brand">
          My<span className="site-mission__brand-accent">Next</span>Mount
        </span>{" "}
        <span className="site-mission__kicker-rest">
          was created to help mount lovers farm more mounts.
        </span>
      </p>
    </div>
  );
}
