import type { MountGuide } from "@/types/mountGuide";

export type Mount = {
  /** Mount summon spell ID (see docs/export-contract.md). */
  id: number;
  name: string;
  source: string;
  boss?: string;
  location: string;
  dropRate: number;
  difficulty: number;
  timeToComplete: number;
  lockout: "daily" | "weekly" | "none";
  expansion: string;
  tags: string[];
  /** Epic B.1 optional extensions — omit until harvest pipeline fills them. */
  wowheadUrl?: string;
  commentsUrl?: string;
  iconFileId?: number;
  /** Blizzard spell media asset URL (Tier 1 enrich); preferred over synthetic file-id URL. */
  iconUrl?: string;
  sourceCategory?: string;
  retailObtainable?: boolean;
  asOfPatch?: string;
  /** Optional one-line farm context from `data/farm-tips.json` (merged at load). */
  farmTip?: string;
  /** Epic C.1 — optional checklist guide from `data/mount-guides.json`. */
  guide?: MountGuide;
  /** Epic D.5 — ≤5 summarized tips from `data/wowhead-comment-digests.json` (merged at load). */
  wowheadCommentDigest?: string[];
  /** ISO date string; editorial refresh of digest lines. */
  wowheadCommentDigestAsOf?: string;
};
