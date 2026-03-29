import type { Mount } from "@/types/mount";

/** Preset session lengths (minutes) for `/tool` (Epic K.5). */
export const SESSION_BUDGET_PRESETS_MIN = [30, 45, 60] as const;

export type SessionBudgetPreset = (typeof SESSION_BUDGET_PRESETS_MIN)[number];

export type FarmRouteGroup = {
  expansion: string;
  zoneLabel: string;
  mounts: Mount[];
  /** Sum of `max(1, timeToComplete)` for mounts in this group. */
  totalMinutes: number;
};

export type FarmSessionPlan = {
  budgetMinutes: number;
  includedMounts: Mount[];
  routeGroups: FarmRouteGroup[];
  totalMinutes: number;
  /** True when the first pick alone exceeds the budget (still included). */
  exceedsBudget: boolean;
};

function minutesForMount(m: Mount): number {
  return Math.max(1, m.timeToComplete);
}

/**
 * Stable route bucket: expansion + catalog `location` (zone line).
 */
export function routeKeyForMount(mount: Mount): string {
  const exp = (mount.expansion ?? "").trim() || "Unknown expansion";
  const loc = (mount.location ?? "").trim() || "Unknown location";
  return `${exp}\n${loc}`;
}

/**
 * Group mounts in **visit order**; first-seen route defines group order.
 */
export function groupMountsIntoRouteGroups(
  mountsInVisitOrder: readonly Mount[],
): FarmRouteGroup[] {
  const byKey = new Map<string, Mount[]>();
  const keyOrder: string[] = [];
  for (const m of mountsInVisitOrder) {
    const k = routeKeyForMount(m);
    if (!byKey.has(k)) {
      keyOrder.push(k);
      byKey.set(k, []);
    }
    byKey.get(k)!.push(m);
  }
  return keyOrder.map((k) => {
    const mounts = byKey.get(k)!;
    const first = mounts[0]!;
    const expansion = (first.expansion ?? "").trim() || "Unknown expansion";
    const zoneLabel = (first.location ?? "").trim() || "Unknown location";
    const totalMinutes = mounts.reduce((s, x) => s + minutesForMount(x), 0);
    return { expansion, zoneLabel, mounts, totalMinutes };
  });
}

/**
 * Epic K.5 — greedy session from an already-ranked farm list: add mounts in order
 * until adding the next would pass `budgetMinutes` (always keep at least one if the list is non-empty).
 */
export function buildFarmSessionPlan(
  rankedMounts: readonly Mount[],
  budgetMinutes: number,
): FarmSessionPlan {
  const cap = Math.max(1, Math.floor(budgetMinutes));
  const included: Mount[] = [];
  let sum = 0;
  let exceedsBudget = false;

  for (const m of rankedMounts) {
    const t = minutesForMount(m);
    if (sum + t <= cap) {
      included.push(m);
      sum += t;
      continue;
    }
    if (included.length === 0) {
      included.push(m);
      sum += t;
      exceedsBudget = sum > cap;
      break;
    }
    break;
  }

  return {
    budgetMinutes: cap,
    includedMounts: included,
    routeGroups: groupMountsIntoRouteGroups(included),
    totalMinutes: sum,
    exceedsBudget,
  };
}
