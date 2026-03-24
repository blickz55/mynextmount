"use client";

import { useId } from "react";
import type { Mount } from "@/types/mount";

type Props = {
  mount: Mount;
};

/**
 * Epic C.1 — Renders optional checklist + provenance link.
 * Check state is session-only on web; Epic C.2 can persist in the addon.
 */
export function MountGuideBlock({ mount }: Props) {
  const baseId = useId();
  const guide = mount.guide;
  if (!guide) return null;

  return (
    <div className="guide-block">
      <div className="guide-block__title">Farm guide</div>
      <p className="guide-block__overview">{guide.overview}</p>
      <ol className="guide-block__list">
        {guide.checklist.map((step, i) => {
          const cid = `${baseId}-step-${i}`;
          return (
            <li key={cid}>
              <label htmlFor={cid} className="guide-block__check-label">
                <input id={cid} type="checkbox" />
                <span>{step}</span>
              </label>
            </li>
          );
        })}
      </ol>
      <div className="guide-block__source">
        <span>Source: </span>
        <a href={guide.sourceUrl} target="_blank" rel="noopener noreferrer">
          {guide.sourceLabel}
        </a>
      </div>
    </div>
  );
}
