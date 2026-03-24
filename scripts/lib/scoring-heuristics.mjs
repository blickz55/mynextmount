/**
 * Epic B.5 — Derive scoring fields from `sourceCategory` (Blizzard mount `source.type`, lowercased).
 * Tuned for `lib/scoreEasiest.ts` and `lib/scoreRarest.ts` (dropRate, difficulty, time, lockout, tags).
 */

export const SCORING_HEURISTICS_VERSION = 1;

/** @type {Record<string, { dropRate: number, difficulty: number, timeToComplete: number, lockout: string, tags: string[] }>} */
const BY_CATEGORY = {
  vendor: {
    dropRate: 1,
    difficulty: 1,
    timeToComplete: 20,
    lockout: "none",
    tags: [],
  },
  quest: {
    dropRate: 0.85,
    difficulty: 2,
    timeToComplete: 45,
    lockout: "none",
    tags: [],
  },
  achievement: {
    dropRate: 0.25,
    difficulty: 3,
    timeToComplete: 180,
    lockout: "none",
    tags: [],
  },
  drop: {
    dropRate: 0.02,
    difficulty: 4,
    timeToComplete: 120,
    lockout: "weekly",
    tags: ["rare"],
  },
  profession: {
    dropRate: 0.18,
    difficulty: 3,
    timeToComplete: 300,
    lockout: "none",
    tags: [],
  },
  promotion: {
    dropRate: 0.9,
    difficulty: 1,
    timeToComplete: 15,
    lockout: "none",
    tags: [],
  },
  petstore: {
    dropRate: 0.95,
    difficulty: 1,
    timeToComplete: 5,
    lockout: "none",
    tags: [],
  },
  tcg: {
    dropRate: 0.35,
    difficulty: 2,
    timeToComplete: 30,
    lockout: "none",
    tags: ["rare"],
  },
  tradingpost: {
    dropRate: 0.65,
    difficulty: 2,
    timeToComplete: 90,
    lockout: "none",
    tags: [],
  },
  discovery: {
    dropRate: 0.3,
    difficulty: 2,
    timeToComplete: 90,
    lockout: "none",
    tags: [],
  },
  worldevent: {
    dropRate: 0.35,
    difficulty: 2,
    timeToComplete: 60,
    lockout: "none",
    tags: [],
  },
  default: {
    dropRate: 0.15,
    difficulty: 3,
    timeToComplete: 60,
    lockout: "none",
    tags: [],
  },
};

/**
 * Mutates `row`: sets dropRate, difficulty, timeToComplete, lockout, tags from `row.sourceCategory`.
 * Preserves `stub` in tags when present.
 */
export function applyScoringHeuristics(row) {
  const cat = String(row.sourceCategory || "")
    .toLowerCase()
    .trim();
  const spec = BY_CATEGORY[cat] || BY_CATEGORY.default;
  const hadStub = Array.isArray(row.tags) && row.tags.includes("stub");

  row.dropRate = Math.min(1, Math.max(0, spec.dropRate));
  row.difficulty = Math.min(5, Math.max(1, Math.round(spec.difficulty)));
  row.timeToComplete = Math.max(1, Math.round(spec.timeToComplete));
  row.lockout = spec.lockout;

  const tags = [...spec.tags];
  if (hadStub && !tags.includes("stub")) tags.push("stub");
  row.tags = tags;
}

export function listScoringCategories() {
  return Object.keys(BY_CATEGORY).filter((k) => k !== "default");
}
