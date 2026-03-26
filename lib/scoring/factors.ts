import type { Mount } from "@/types/mount";

import type { FactorVector, ScoringContext } from "./types";

/** Clamp numeric to [lo, hi]. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Soft weekly attempt budget for ranking (not in-game truth). See docs. */
export function attemptsPerWeek(lockout: Mount["lockout"]): number {
  switch (lockout) {
    case "weekly":
      return 1;
    case "daily":
      return 7;
    case "none":
    default:
      return 42;
  }
}

const DROP_FLOOR = 1e-4;
const TIME_CAP_MIN = 240;

const ACCESSIBILITY_BY_CATEGORY: Record<string, number> = {
  petstore: 0.98,
  promotion: 0.72,
  tradingpost: 0.88,
  vendor: 0.94,
  quest: 0.9,
  achievement: 0.78,
  profession: 0.86,
  discovery: 0.68,
  worldevent: 0.74,
  tcg: 0.55,
  drop: 0.58,
  pvp: 0.62,
  secret: 0.65,
};

/**
 * Map `sourceCategory` to a 0–1 “low friction / predictable obtain” score.
 */
export function accessibilityFromCategory(sourceCategory: string | undefined): number {
  const key = (sourceCategory || "").toLowerCase().trim();
  if (!key) return 0.65;
  return ACCESSIBILITY_BY_CATEGORY[key] ?? 0.65;
}

/**
 * log10(drop) stretched to [0, 1] between DROP_FLOOR and 1.
 * High output = player-favorable odds.
 */
export function dropLogProspect(dropRate: number): number {
  const p = clamp(dropRate, DROP_FLOOR, 1);
  const lo = Math.log10(DROP_FLOOR);
  const hi = 0;
  return clamp((Math.log10(p) - lo) / (hi - lo), 0, 1);
}

/**
 * Throughput proxy: expected-scale weight using p, attempts/week, and run length.
 * Squashed with 1 - exp(-raw / scale) to stay in (0,1) without catalog-wide norms.
 */
export function evThroughputNormalized(
  mount: Pick<Mount, "dropRate" | "timeToComplete" | "lockout">,
  scale = 2.5,
): number {
  const p = clamp(mount.dropRate, DROP_FLOOR, 1);
  const hours = Math.max(mount.timeToComplete, 1) / 60;
  const apw = attemptsPerWeek(mount.lockout);
  const raw = (p * apw) / Math.max(hours, 0.08);
  return clamp(1 - Math.exp(-raw / scale), 0, 1);
}

/**
 * Full factor vector for composite scoring (all components in [0, 1]).
 */
export function computeFactorVector(
  mount: Mount,
  ctx?: ScoringContext,
): FactorVector {
  const dropLinear = clamp(mount.dropRate, 0, 1);
  const easeFromDifficulty = clamp(1 - mount.difficulty / 5, 0, 1);
  const timeMin = Math.max(mount.timeToComplete, 1);
  const timeEfficiency = clamp(
    1 - Math.log1p(timeMin) / Math.log1p(TIME_CAP_MIN),
    0,
    1,
  );
  const apw = attemptsPerWeek(mount.lockout);
  const lockoutFlex = clamp(apw / 42, 0, 1);

  const dlp = dropLogProspect(mount.dropRate);
  const rareTag = mount.tags.includes("rare") ? 1 : 0;
  const difficultyIntensity = clamp(mount.difficulty / 5, 0, 1);
  const prestige = clamp(
    0.55 * (1 - dlp) + 0.25 * difficultyIntensity + 0.2 * rareTag,
    0,
    1,
  );

  const expKey = (mount.expansion || "").trim().toLowerCase();
  const progressProximity =
    expKey && ctx?.completionByExpansion?.[expKey] != null
      ? clamp(ctx.completionByExpansion[expKey]!, 0, 1)
      : 0.5;

  return {
    easeFromDifficulty,
    dropLogProspect: dlp,
    dropLinear,
    dropScarcity: clamp(1 - dropLinear, 0, 1),
    timeEfficiency,
    difficultyIntensity,
    rareTagBonus: rareTag,
    lockoutFlex,
    accessibility: accessibilityFromCategory(mount.sourceCategory),
    prestige,
    evThroughput: evThroughputNormalized(mount),
    progressProximity,
  };
}
