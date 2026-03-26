"use client";

import { useEffect, useState } from "react";
import { largerSpellIconCandidate } from "@/lib/mountPreviewLargeSrc";
import { mountIconSrc } from "@/lib/mountIconSrc";
import type { Mount } from "@/types/mount";

const PREVIEW_LARGE =
  process.env.NEXT_PUBLIC_MOUNT_PREVIEW_LARGE === "1";

type Props = {
  mount: Mount;
  size?: number;
};

/**
 * Epic D.2 — Lazy-loaded spell icon next to mount name (`alt=""`: name is in sibling text).
 * Epic D.8 — Icon sits in a consistent tile (fixed dimensions from `size`).
 * Epic I.4 — Optional larger texture URL when **`NEXT_PUBLIC_MOUNT_PREVIEW_LARGE=1`**; falls back on **`error`**.
 */
export function MountIcon({ mount, size = 36 }: Props) {
  const baseSrc = mountIconSrc(mount);
  const [useBaseOnly, setUseBaseOnly] = useState(false);

  useEffect(() => {
    setUseBaseOnly(false);
  }, [baseSrc]);

  if (!baseSrc) return null;

  const candidate =
    PREVIEW_LARGE && !useBaseOnly
      ? largerSpellIconCandidate(baseSrc)
      : baseSrc;
  const imgSrc = candidate;

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
        src={imgSrc}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (PREVIEW_LARGE && imgSrc !== baseSrc) setUseBaseOnly(true);
        }}
      />
    </span>
  );
}
