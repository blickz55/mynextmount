import { mountIconSrc } from "@/lib/mountIconSrc";
import type { Mount } from "@/types/mount";

type Props = {
  mount: Mount;
  size?: number;
};

/**
 * Epic D.2 — Lazy-loaded spell icon next to mount name (`alt=""`: name is in sibling text).
 * Epic D.8 — Icon sits in a consistent tile (fixed dimensions from `size`).
 */
export function MountIcon({ mount, size = 36 }: Props) {
  const src = mountIconSrc(mount);
  if (!src) return null;

  const pad = 6;

  return (
    <span
      className="mount-icon-tile"
      style={{
        width: size + pad,
        height: size + pad,
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
