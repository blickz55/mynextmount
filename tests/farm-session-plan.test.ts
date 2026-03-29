import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import {
  buildFarmSessionPlan,
  groupMountsIntoRouteGroups,
  routeKeyForMount,
  SESSION_BUDGET_PRESETS_MIN,
} from "@/lib/farmSessionPlan";
import type { Mount } from "@/types/mount";

const catalog = catalogJson as Mount[];

describe("routeKeyForMount", () => {
  it("joins expansion and location", () => {
    const m = catalog[0]!;
    expect(routeKeyForMount(m)).toContain("Fixture");
    expect(routeKeyForMount(m)).toContain("Fixture Vale");
  });
});

describe("groupMountsIntoRouteGroups", () => {
  it("preserves visit order and aggregates time", () => {
    const a = catalog[0]!;
    const b = { ...catalog[1]!, location: "Other Zone" };
    const groups = groupMountsIntoRouteGroups([a, b, a]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.mounts).toHaveLength(2);
    expect(groups[1]!.mounts).toHaveLength(1);
    expect(groups[0]!.totalMinutes).toBeGreaterThan(0);
  });
});

describe("buildFarmSessionPlan", () => {
  it("respects budget when possible", () => {
    const ranked = catalog.filter((m) => m.retailObtainable !== false);
    const plan = buildFarmSessionPlan(ranked, 40);
    expect(plan.totalMinutes).toBeLessThanOrEqual(40);
    expect(plan.exceedsBudget).toBe(false);
    expect(plan.includedMounts.length).toBeGreaterThan(0);
  });

  it("includes at least one mount when first exceeds budget", () => {
    const m = catalog[1]!; // 100 min
    const plan = buildFarmSessionPlan([m], 30);
    expect(plan.includedMounts).toHaveLength(1);
    expect(plan.exceedsBudget).toBe(true);
    expect(plan.totalMinutes).toBe(100);
  });

  it("returns empty for empty input", () => {
    const plan = buildFarmSessionPlan([], 45);
    expect(plan.includedMounts).toHaveLength(0);
    expect(plan.routeGroups).toHaveLength(0);
    expect(plan.totalMinutes).toBe(0);
  });

  it("clamps non-positive budget to 1", () => {
    const plan = buildFarmSessionPlan([catalog[0]!], 0);
    expect(plan.budgetMinutes).toBe(1);
  });
});

describe("SESSION_BUDGET_PRESETS_MIN", () => {
  it("lists 30/45/60", () => {
    expect(SESSION_BUDGET_PRESETS_MIN).toEqual([30, 45, 60]);
  });
});
