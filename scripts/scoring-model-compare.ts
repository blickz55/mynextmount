/**
 * Offline comparison: legacy `scoreEasiest` vs composite Efficient / Balanced.
 * Run: npx tsx scripts/scoring-model-compare.ts
 *
 * Writes data/build/scoring-model-compare.json (summary + top rank deltas).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Mount } from "../types/mount";
import { scoreEasiest } from "../lib/scoreEasiest";
import { scoreForRecommendationMode } from "../lib/scoring/composite";
import { spearmanRho } from "../lib/scoring/stats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadCatalog(): Mount[] {
  const raw = readFileSync(join(root, "data", "mounts.json"), "utf8");
  const data = JSON.parse(raw) as unknown;
  return Array.isArray(data) ? (data as Mount[]) : [];
}

function ranksFromScores(scores: number[]): number[] {
  const n = scores.length;
  const order = scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s);
  const rank = new Array<number>(n);
  let pos = 0;
  while (pos < n) {
    let end = pos;
    while (end + 1 < n && order[end + 1]!.s === order[pos]!.s) end++;
    const r = pos + 1;
    for (let k = pos; k <= end; k++) rank[order[k]!.i] = r;
    pos = end + 1;
  }
  return rank;
}

function main() {
  const all = loadCatalog().filter(
    (m) => m.retailObtainable !== false && typeof m.id === "number",
  );
  const step = Math.max(1, Math.floor(all.length / 320));
  const sample: Mount[] = [];
  for (let i = 0; i < all.length && sample.length < 320; i += step) {
    sample.push(all[i]!);
  }

  const sLegacy = sample.map(scoreEasiest);
  const sEff = sample.map((m) => scoreForRecommendationMode(m, "efficient").score);
  const sBal = sample.map((m) => scoreForRecommendationMode(m, "balanced").score);

  const rhoLegacyEff = spearmanRho(sLegacy, sEff);
  const rhoLegacyBal = spearmanRho(sLegacy, sBal);
  const rhoEffBal = spearmanRho(sEff, sBal);

  const rLegacy = ranksFromScores(sLegacy);
  const rEff = ranksFromScores(sEff);

  const deltas = sample.map((m, i) => ({
    id: m.id,
    name: m.name,
    legacyRank: rLegacy[i]!,
    efficientRank: rEff[i]!,
    delta: Math.abs(rLegacy[i]! - rEff[i]!),
    legacyScore: sLegacy[i],
    efficientScore: sEff[i]!,
  }));
  deltas.sort((a, b) => b.delta - a.delta);
  const topDeltas = deltas.slice(0, 12).map((d) => ({
    ...d,
    note:
      "Large |Δrank| usually means EV/lockout terms disagreed with legacy (difficulty + raw drop + 1/time).",
  }));

  /** Sensitivity: perturb inputs for mounts in top-N by legacy easiest; report mean |Δrank|. */
  const sensN = Math.min(40, sample.length);
  const baselineOrder = sample
    .map((m, i) => ({ i, s: sLegacy[i]! }))
    .sort((a, b) => b.s - a.s)
    .slice(0, sensN)
    .map((x) => x.i);
  const perturbedDrop = sample.map((m) => ({
    ...m,
    dropRate: Math.min(1, m.dropRate * 1.08),
  }));
  const sLegacyDrop = perturbedDrop.map(scoreEasiest);
  const rLegacyDrop = ranksFromScores(sLegacyDrop);
  let sensDrop = 0;
  for (const idx of baselineOrder) {
    sensDrop += Math.abs(rLegacy[idx]! - rLegacyDrop[idx]!);
  }
  const perturbedTime = sample.map((m) => ({
    ...m,
    timeToComplete: Math.min(600, Math.ceil(m.timeToComplete * 1.2)),
  }));
  const sLegacyTime = perturbedTime.map(scoreEasiest);
  const rLegacyTime = ranksFromScores(sLegacyTime);
  let sensTime = 0;
  for (const idx of baselineOrder) {
    sensTime += Math.abs(rLegacy[idx]! - rLegacyTime[idx]!);
  }

  const outDir = join(root, "data", "build");
  const outPath = join(outDir, "scoring-model-compare.json");
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sampleSize: sample.length,
    step,
    spearman: {
      legacyEasiest_vs_efficient: rhoLegacyEff,
      legacyEasiest_vs_balanced: rhoLegacyBal,
      efficient_vs_balanced: rhoEffBal,
    },
    sensitivity: {
      description:
        "Top 40 by legacy easiest: mean |Δrank| after scoreEasiest perturbation",
      legacyEasiest_dropRate_x1_08_meanAbsRankDelta: sensDrop / baselineOrder.length,
      legacyEasiest_timeToComplete_x1_2_meanAbsRankDelta:
        sensTime / baselineOrder.length,
    },
    topRankDeltasLegacyVsEfficient: topDeltas,
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report.spearman, null, 2));
  console.log("Wrote", outPath);
}

main();
