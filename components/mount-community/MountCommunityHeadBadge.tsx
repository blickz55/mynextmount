"use client";

import { useMountCommunitySummary } from "@/components/mount-community/MountCommunityProvider";

export function MountCommunityHeadBadge({ spellId }: { spellId: number }) {
  const summary = useMountCommunitySummary(spellId);
  const n = summary.commentCount;
  if (n === 0) {
    return (
      <span
        className="mount-community-head-badge mount-community-head-badge--empty"
        title="No community comments yet — open Community below to add one"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="mount-community-head-badge mount-community-head-badge--has"
      title={`${n} community comment${n === 1 ? "" : "s"}`}
    >
      {n}
    </span>
  );
}
