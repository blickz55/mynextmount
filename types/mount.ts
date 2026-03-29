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
  /**
   * Wowhead item id for the page that teaches this mount (bridle/reins/item).
   * When set, outbound “comments on Wowhead” links use `/item=…#comments` (journal item context).
   */
  wowheadItemId?: number;
  iconFileId?: number;
  /** Blizzard spell media asset URL (Tier 1 enrich); preferred over synthetic file-id URL. */
  iconUrl?: string;
  sourceCategory?: string;
  /** false = curated “no longer obtainable in Retail” (`data/overrides/retail-unobtainable.json`). Omitted or true = eligible for farm list. */
  retailObtainable?: boolean;
  /** Harvest or curation stamp (e.g. build manifest gameVersion or `curated-…`). */
  asOfPatch?: string;
  /** Optional one-line farm context from `data/farm-tips.json` (merged at load). */
  farmTip?: string;
  /** Epic C.1 — optional checklist guide from `data/mount-guides.json`. */
  guide?: MountGuide;
  /** Epic D.5 — short acquisition bullets from `data/wowhead-comment-digests.json` (merged at load; up to 5). */
  wowheadCommentDigest?: string[];
  /** Optional short flavor paragraph (same file; LLM or editorial). */
  wowheadMountFlavor?: string;
  /** Batch-generated Archivist hover lore (`data/mount-hover-lore.json`); Markdown. */
  mountHoverLore?: string;
  /** ISO date string; editorial refresh of digest lines. */
  wowheadCommentDigestAsOf?: string;
};
