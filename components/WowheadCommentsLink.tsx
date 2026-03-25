import { resolveWowheadCommentsLink } from "@/lib/wowheadCommentsUrl";
import type { Mount } from "@/types/mount";

type Props = {
  mount: Mount;
};

/** Compact inline link to Wowhead comments (item page when mapped). */
export function WowheadCommentsLink({ mount }: Props) {
  const target = resolveWowheadCommentsLink(mount);
  if (!target) return null;

  const label =
    target.pageKind === "item"
      ? `Wowhead item comments for ${mount.name}`
      : `Wowhead spell comments for ${mount.name}`;

  const suffix =
    target.pageKind === "item"
      ? "Item page, comments tab"
      : "Spell page until item id is mapped";

  return (
    <div style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
      <a
        href={target.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (opens in new tab)`}
      >
        {target.pageKind === "item"
          ? "Wowhead (item → comments)"
          : "Wowhead (spell → comments)"}
      </a>
      <span style={{ color: "#888" }}> — {suffix}</span>
    </div>
  );
}
