import { mountLooksRaidHeavy } from "@/lib/mountRaidHeavy";
import { clamp } from "@/lib/scoring/factors";
import type { FarmBehaviorSignals } from "@/lib/scoring/types";
import type { Mount } from "@/types/mount";

export const FARM_PREF_SCHEMA_VERSION = 1 as const;

/** Persisted in `localStorage` under {@link FARM_PREF_STORAGE_KEY}. */
export type FarmPreferenceStoredV1 = {
  v: typeof FARM_PREF_SCHEMA_VERSION;
  /** EMA of `timeToComplete` (minutes) for mounts the user expanded “Score” for. */
  engagedTimeEma: number | null;
  engagedTimeSamples: number;
  /** `spellId` → calendar day `YYYY-MM-DD` (UTC) of last engagement record. */
  lastEngagedDayBySpellId: Record<string, string>;
  /** “Show less like this” on {@link mountLooksRaidHeavy} mounts. */
  deprioritizeRaidLikeCount: number;
  /** Other deprioritize clicks (reserved / analytics). */
  deprioritizeOtherCount: number;
};

export function defaultFarmPreferenceStored(): FarmPreferenceStoredV1 {
  return {
    v: FARM_PREF_SCHEMA_VERSION,
    engagedTimeEma: null,
    engagedTimeSamples: 0,
    lastEngagedDayBySpellId: {},
    deprioritizeRaidLikeCount: 0,
    deprioritizeOtherCount: 0,
  };
}

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Record one engagement from opening the Score block (throttled once per mount per UTC day). */
export function applyEngagementSample(
  state: FarmPreferenceStoredV1,
  spellId: number,
  timeToCompleteMinutes: number,
): FarmPreferenceStoredV1 {
  const day = utcDayKey();
  const key = String(spellId);
  if (state.lastEngagedDayBySpellId[key] === day) {
    return state;
  }
  const t = Math.max(1, timeToCompleteMinutes);
  const nextEma =
    state.engagedTimeEma == null
      ? t
      : 0.65 * state.engagedTimeEma + 0.35 * t;
  return {
    ...state,
    engagedTimeEma: nextEma,
    engagedTimeSamples: state.engagedTimeSamples + 1,
    lastEngagedDayBySpellId: { ...state.lastEngagedDayBySpellId, [key]: day },
  };
}

export function applyDeprioritize(
  state: FarmPreferenceStoredV1,
  mount: Mount,
): FarmPreferenceStoredV1 {
  if (mountLooksRaidHeavy(mount)) {
    return {
      ...state,
      deprioritizeRaidLikeCount: state.deprioritizeRaidLikeCount + 1,
    };
  }
  return {
    ...state,
    deprioritizeOtherCount: state.deprioritizeOtherCount + 1,
  };
}

/**
 * Derive [0,1] strengths for scoring. Returns `undefined` when there is nothing meaningful.
 */
export function deriveFarmBehaviorSignals(
  stored: FarmPreferenceStoredV1 | null,
): FarmBehaviorSignals | undefined {
  if (!stored || stored.v !== FARM_PREF_SCHEMA_VERSION) return undefined;

  let preferShort = 0;
  if (stored.engagedTimeSamples >= 2 && stored.engagedTimeEma != null) {
    preferShort = clamp(1 - stored.engagedTimeEma / 90, 0, 1);
  }

  let raidAv = 0;
  if (stored.deprioritizeRaidLikeCount >= 2) {
    raidAv = clamp(
      stored.deprioritizeRaidLikeCount /
        (stored.deprioritizeRaidLikeCount + 8),
      0,
      1,
    );
  }

  if (preferShort < 0.06 && raidAv < 0.06) return undefined;
  return { preferShortRunsStrength: preferShort, raidAvoidanceStrength: raidAv };
}
