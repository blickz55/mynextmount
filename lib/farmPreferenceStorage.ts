import {
  applyDeprioritize,
  applyEngagementSample,
  defaultFarmPreferenceStored,
  type FarmPreferenceStoredV1,
  FARM_PREF_SCHEMA_VERSION,
} from "@/lib/farmPreferenceModel";
import type { Mount } from "@/types/mount";

export const FARM_PREF_STORAGE_KEY = "mnm-farm-prefs-v1";

export const FARM_PREF_CHANGED_EVENT = "mnm-farm-prefs-changed";

function parseStored(raw: string | null): FarmPreferenceStoredV1 | null {
  if (raw == null || raw === "") return null;
  try {
    const o = JSON.parse(raw) as Partial<FarmPreferenceStoredV1>;
    if (o.v !== FARM_PREF_SCHEMA_VERSION) return null;
    return {
      v: FARM_PREF_SCHEMA_VERSION,
      engagedTimeEma:
        typeof o.engagedTimeEma === "number" && Number.isFinite(o.engagedTimeEma)
          ? o.engagedTimeEma
          : null,
      engagedTimeSamples:
        typeof o.engagedTimeSamples === "number" && o.engagedTimeSamples >= 0
          ? Math.floor(o.engagedTimeSamples)
          : 0,
      lastEngagedDayBySpellId:
        o.lastEngagedDayBySpellId != null &&
        typeof o.lastEngagedDayBySpellId === "object"
          ? { ...o.lastEngagedDayBySpellId }
          : {},
      deprioritizeRaidLikeCount:
        typeof o.deprioritizeRaidLikeCount === "number" &&
        o.deprioritizeRaidLikeCount >= 0
          ? Math.floor(o.deprioritizeRaidLikeCount)
          : 0,
      deprioritizeOtherCount:
        typeof o.deprioritizeOtherCount === "number" &&
        o.deprioritizeOtherCount >= 0
          ? Math.floor(o.deprioritizeOtherCount)
          : 0,
    };
  } catch {
    return null;
  }
}

export function loadFarmPreferenceStored(): FarmPreferenceStoredV1 | null {
  if (typeof window === "undefined") return null;
  return parseStored(window.localStorage.getItem(FARM_PREF_STORAGE_KEY));
}

export function saveFarmPreferenceStored(data: FarmPreferenceStoredV1): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FARM_PREF_STORAGE_KEY, JSON.stringify(data));
}

export function clearFarmPreferenceStored(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(FARM_PREF_STORAGE_KEY);
  window.dispatchEvent(new Event(FARM_PREF_CHANGED_EVENT));
}

export function updateFarmPreference(
  mutator: (draft: FarmPreferenceStoredV1) => void,
): void {
  if (typeof window === "undefined") return;
  const base = loadFarmPreferenceStored() ?? defaultFarmPreferenceStored();
  mutator(base);
  saveFarmPreferenceStored(base);
  window.dispatchEvent(new Event(FARM_PREF_CHANGED_EVENT));
}

export function recordFarmScoreEngagement(
  spellId: number,
  timeToCompleteMinutes: number,
): void {
  updateFarmPreference((d) => {
    const next = applyEngagementSample(d, spellId, timeToCompleteMinutes);
    Object.assign(d, next);
  });
}

export function recordFarmDeprioritize(mount: Mount): void {
  updateFarmPreference((d) => {
    const next = applyDeprioritize(d, mount);
    Object.assign(d, next);
  });
}
