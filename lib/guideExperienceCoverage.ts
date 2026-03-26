/**
 * Epic I.6 — Combined guide + digest + farm-tip coverage vs catalog (see `docs/guide-experience-roadmap.md`).
 */

export type MinimalMount = { id: number; wowheadUrl?: string };

type GuidesFile = {
  guides?: Record<
    string,
    {
      overview?: string;
      checklist?: string[];
      sourceUrl?: string;
    }
  >;
};

type DigestRow = { flavor?: unknown; lines?: unknown };

export function guideComplete(guidesFile: unknown, id: number): boolean {
  const g = (guidesFile as GuidesFile)?.guides?.[String(id)];
  if (!g) return false;
  const ov = typeof g.overview === "string" && g.overview.trim();
  const cl =
    Array.isArray(g.checklist) && g.checklist.some((s) => String(s).trim());
  const su = typeof g.sourceUrl === "string" && g.sourceUrl.trim();
  return Boolean(ov && cl && su);
}

export function digestComplete(digests: unknown, id: number): boolean {
  const row = (digests as Record<string, DigestRow>)[String(id)];
  if (!row) return false;
  const flavor = typeof row.flavor === "string" && row.flavor.trim();
  const lines =
    Array.isArray(row.lines) && row.lines.some((s) => String(s).trim());
  return Boolean(flavor || lines);
}

export function farmTipPresent(tips: unknown, id: number): boolean {
  const t = (tips as Record<string, unknown>)[String(id)];
  return typeof t === "string" && t.trim() !== "";
}

function hasWowheadUrl(m: MinimalMount): boolean {
  return typeof m.wowheadUrl === "string" && m.wowheadUrl.trim() !== "";
}

function pct(n: number, d: number): number {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

const DEFAULT_SAMPLE = 40;

export type GuideExperienceReport = {
  schemaVersion: 2;
  generatedAt: string;
  source: string;
  maintainerTarget: {
    description: string;
    primaryMetric: string;
  };
  counts: {
    mountRows: number;
    withWowheadUrl: number;
    withGuide: number;
    withDigest: number;
    withFarmTip: number;
    richPanelGuideAndDigest: number;
    fullExperienceGuideDigestFarmTip: number;
  };
  percent: {
    withGuide: number;
    withDigest: number;
    withFarmTip: number;
    richPanelGuideAndDigest: number;
    fullExperienceGuideDigestFarmTip: number;
  };
  /** Denominator = mounts with `wowheadUrl` (I.6 default target scope). */
  percentOfWowheadUrl: {
    withGuide: number;
    withDigest: number;
    withFarmTip: number;
    richPanelGuideAndDigest: number;
    fullExperienceGuideDigestFarmTip: number;
  };
  samples: {
    missingGuideSpellIds: number[];
    missingDigestAmongWowheadSpellIds: number[];
    missingFarmTipSpellIds: number[];
    missingRichPanelAmongWowheadSpellIds: number[];
    note: string;
  };
};

export function buildGuideExperienceReport(
  mounts: MinimalMount[],
  guidesFile: unknown,
  digests: unknown,
  farmTips: unknown,
  options?: { sampleLimit?: number },
): GuideExperienceReport {
  const sampleLimit = options?.sampleLimit ?? DEFAULT_SAMPLE;

  let withWowheadUrl = 0;
  let withGuide = 0;
  let withDigest = 0;
  let withFarmTip = 0;
  let richPanel = 0;
  let fullStack = 0;

  let amongWhGuide = 0;
  let amongWhDigest = 0;
  let amongWhFarmTip = 0;
  let amongWhRich = 0;
  let amongWhFull = 0;

  const missingGuide: number[] = [];
  const missingDigestAmongWowhead: number[] = [];
  const missingFarmTip: number[] = [];
  const missingRichAmongWowhead: number[] = [];

  for (const m of mounts) {
    const id = m.id;
    const wh = hasWowheadUrl(m);
    if (wh) withWowheadUrl++;

    const g = guideComplete(guidesFile, id);
    const d = digestComplete(digests, id);
    const t = farmTipPresent(farmTips, id);

    if (g) withGuide++;
    else missingGuide.push(id);

    if (d) withDigest++;
    if (t) withFarmTip++;
    if (g && d) richPanel++;
    if (g && d && t) fullStack++;

    if (wh) {
      if (g) amongWhGuide++;
      if (d) amongWhDigest++;
      if (t) amongWhFarmTip++;
      if (g && d) amongWhRich++;
      if (g && d && t) amongWhFull++;
      if (!d) missingDigestAmongWowhead.push(id);
      if (!(g && d)) missingRichAmongWowhead.push(id);
    }

    if (!t) missingFarmTip.push(id);
  }

  const total = mounts.length;

  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    source:
      "mount-guides.json + wowhead-comment-digests.json + farm-tips.json vs data/mounts.json",
    maintainerTarget: {
      description:
        "Default (I.6): every mount with wowheadUrl has written guide + mount spotlight (digest: flavor or lines). Optional stretch: farmTip on the same set.",
      primaryMetric: "percentOfWowheadUrl.richPanelGuideAndDigest",
    },
    counts: {
      mountRows: total,
      withWowheadUrl,
      withGuide,
      withDigest,
      withFarmTip,
      richPanelGuideAndDigest: richPanel,
      fullExperienceGuideDigestFarmTip: fullStack,
    },
    percent: {
      withGuide: pct(withGuide, total),
      withDigest: pct(withDigest, total),
      withFarmTip: pct(withFarmTip, total),
      richPanelGuideAndDigest: pct(richPanel, total),
      fullExperienceGuideDigestFarmTip: pct(fullStack, total),
    },
    percentOfWowheadUrl: {
      withGuide: pct(amongWhGuide, withWowheadUrl),
      withDigest: pct(amongWhDigest, withWowheadUrl),
      withFarmTip: pct(amongWhFarmTip, withWowheadUrl),
      richPanelGuideAndDigest: pct(amongWhRich, withWowheadUrl),
      fullExperienceGuideDigestFarmTip: pct(amongWhFull, withWowheadUrl),
    },
    samples: {
      missingGuideSpellIds: missingGuide.slice(0, sampleLimit),
      missingDigestAmongWowheadSpellIds: missingDigestAmongWowhead.slice(
        0,
        sampleLimit,
      ),
      missingFarmTipSpellIds: missingFarmTip.slice(0, sampleLimit),
      missingRichPanelAmongWowheadSpellIds: missingRichAmongWowhead.slice(
        0,
        sampleLimit,
      ),
      note: `Truncated to ${sampleLimit} ids each; full lists are derivable from JSON sources.`,
    },
  };
}
