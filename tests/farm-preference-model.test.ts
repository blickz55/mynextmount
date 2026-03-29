import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import {
  applyDeprioritize,
  applyEngagementSample,
  defaultFarmPreferenceStored,
  deriveFarmBehaviorSignals,
} from "@/lib/farmPreferenceModel";
import { mountLooksRaidHeavy } from "@/lib/mountRaidHeavy";
import type { Mount } from "@/types/mount";

const catalog = catalogJson as Mount[];

describe("mountLooksRaidHeavy", () => {
  it("detects raid in source or tags or hard drop", () => {
    const raidSrc = { ...catalog[0]!, source: "DROP — Some raid boss" };
    expect(mountLooksRaidHeavy(raidSrc)).toBe(true);
    const raidTag = { ...catalog[0]!, tags: ["raid"] };
    expect(mountLooksRaidHeavy(raidTag)).toBe(true);
    expect(mountLooksRaidHeavy(catalog[1]!)).toBe(true);
    expect(mountLooksRaidHeavy(catalog[3]!)).toBe(false);
  });
});

describe("deriveFarmBehaviorSignals", () => {
  it("returns undefined for empty state", () => {
    expect(deriveFarmBehaviorSignals(null)).toBeUndefined();
    expect(deriveFarmBehaviorSignals(defaultFarmPreferenceStored())).toBeUndefined();
  });

  it("derives prefer-short from engagement EMA", () => {
    let s = defaultFarmPreferenceStored();
    s = applyEngagementSample(s, 1, 15);
    s = applyEngagementSample(s, 2, 20);
    const b = deriveFarmBehaviorSignals(s);
    expect(b?.preferShortRunsStrength).toBeGreaterThan(0.2);
  });

  it("derives raid avoidance from deprioritize strikes", () => {
    let s = defaultFarmPreferenceStored();
    const raidMount = catalog[1]!;
    expect(mountLooksRaidHeavy(raidMount)).toBe(true);
    s = applyDeprioritize(s, raidMount);
    s = applyDeprioritize(s, raidMount);
    const b = deriveFarmBehaviorSignals(s);
    expect(b?.raidAvoidanceStrength).toBeGreaterThan(0);
  });
});

describe("applyEngagementSample", () => {
  it("throttles same spell same UTC day", () => {
    let s = defaultFarmPreferenceStored();
    s = applyEngagementSample(s, 99, 30);
    const again = applyEngagementSample(s, 99, 90);
    expect(again.engagedTimeSamples).toBe(s.engagedTimeSamples);
  });
});
