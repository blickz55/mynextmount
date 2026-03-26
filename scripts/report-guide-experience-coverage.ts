/**
 * Combined coverage for the rich farm row (guide + tips + digest) vs data/mounts.json.
 * Writes data/build/guide-experience-coverage.json
 *
 * Usage: npx tsx scripts/report-guide-experience-coverage.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGuideExperienceReport } from "../lib/guideExperienceCoverage";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const mounts = loadJson(join(root, "data", "mounts.json"));
  const guidesFile = loadJson(join(root, "data", "mount-guides.json"));
  const digests = loadJson(join(root, "data", "wowhead-comment-digests.json"));
  const farmTips = loadJson(join(root, "data", "farm-tips.json"));

  if (!Array.isArray(mounts)) {
    console.error("[guide-experience-coverage] mounts.json must be an array.");
    process.exit(2);
  }

  const report = buildGuideExperienceReport(
    mounts as { id: number; wowheadUrl?: string }[],
    guidesFile,
    digests,
    farmTips,
  );

  const outDir = join(root, "data", "build");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "guide-experience-coverage.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`[guide-experience-coverage] Wrote ${outPath}`);
  console.log(
    `  mounts: ${report.counts.mountRows}; wowheadUrl: ${report.counts.withWowheadUrl}; guide: ${report.counts.withGuide} (${report.percent.withGuide}%); digest: ${report.counts.withDigest} (${report.percent.withDigest}%); farmTip: ${report.counts.withFarmTip} (${report.percent.withFarmTip}%)`,
  );
  console.log(
    `  rich panel (guide + digest): ${report.counts.richPanelGuideAndDigest} (${report.percent.richPanelGuideAndDigest}% of catalog, ${report.percentOfWowheadUrl.richPanelGuideAndDigest}% of wowheadUrl mounts)`,
  );
  console.log(
    `  full stack (+ farmTip): ${report.counts.fullExperienceGuideDigestFarmTip} (${report.percent.fullExperienceGuideDigestFarmTip}% of catalog, ${report.percentOfWowheadUrl.fullExperienceGuideDigestFarmTip}% of wowheadUrl mounts)`,
  );
  console.log(
    `  sample spell ids still needing guide: ${report.samples.missingGuideSpellIds.slice(0, 8).join(", ") || "(none)"}${report.samples.missingGuideSpellIds.length > 8 ? " …" : ""}`,
  );
}

main();
