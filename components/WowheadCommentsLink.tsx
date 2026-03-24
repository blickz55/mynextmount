import { wowheadCommentsUrl } from "@/lib/wowheadCommentsUrl";
import type { Mount } from "@/types/mount";

type Props = {
  mount: Mount;
};

/**
 * Epic D.1 — Opens Wowhead spell page with comments hash in a new tab.
 */
export function WowheadCommentsLink({ mount }: Props) {
  const href = wowheadCommentsUrl(mount);
  if (!href) return null;

  const label = `Wowhead comments for ${mount.name}`;

  return (
    <div style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (opens in new tab)`}
      >
        Wowhead comments
      </a>
      <span style={{ color: "#888" }}> — community tips & drop notes</span>
    </div>
  );
}
