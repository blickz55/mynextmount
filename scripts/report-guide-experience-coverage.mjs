/**
 * Combined coverage for the rich farm row (guide + tips + digest) vs data/mounts.json.
 * Writes data/build/guide-experience-coverage.json
 *
 * Usage: node scripts/report-guide-experience-coverage.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function guideComplete(guidesFile, id) {
  const g = guidesFile?.guides?.[String(id)];
  if (!g) return false;
  const ov = typeof g.overview === "string" && g.overview.trim();
  const cl = Array.isArray(g.checklist) && g.checklist.some((s) => String(s).trim());
  const su = typeof g.sourceUrl === "string" && g.sourceUrl.trim();
  return Boolean(ov && cl && su);
}

function digestComplete(digests, id) {
  const row = digests[String(id)];
  if (!row) return false;
  const flavor = typeof row.flavor === "string" && row.flavor.trim();
  const lines =
    Array.isArray(row.lines) && row.lines.some((s) => String(s).trim());
  return Boolean(flavor || lines);
}

function farmTipPresent(tips, id) {
  const t = tips[String(id)];
  return typeof t === "string" && t.trim() !== "";
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

  let withWowheadUrl = 0;
  let withGuide = 0;
  let withDigest = 0;
  let withFarmTip = 0;
  let richPanel = 0;

  const missingGuide = [];
  const missingDigestAmongWowhead = [];

  for (const m of mounts) {
    const id = m.id;
    const wh =
      typeof m.wowheadUrl === "string" && m.wowheadUrl.trim() !== "";
    if (wh) withWowheadUrl++;

    const g = guideComplete(guidesFile, id);
    const d = digestComplete(digests, id);
    const t = farmTipPresent(farmTips, id);

    if (g) withGuide++;
    else missingGuide.push(id);
    if (d) withDigest++;
    if (t) withFarmTip++;
    if (g && d) richPanel++;

    if (wh && !d) missingDigestAmongWowhead.push(id);
  }

  const total = mounts.length;
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source:
      "mount-guides.json + wowhead-comment-digests.json + farm-tips.json vs data/mounts.json",
    counts: {
      mountRows: total,
      withWowheadUrl,
      withGuide,
      withDigest,
      withFarmTip,
      richPanelGuideAndDigest: richPanel,
    },
    percent: {
      withGuide: pct(withGuide),
      withDigest: pct(withDigest),
      withFarmTip: pct(withFarmTip),
      richPanelGuideAndDigest: pct(richPanel),
    },
    samples: {
      missingGuideSpellIds: missingGuide.slice(0, 40),
      missingDigestAmongWowheadSpellIds: missingDigestAmongWowhead.slice(0, 40),
      note: "Truncated to 40 ids each; full lists are derivable from JSON sources.",
    },
  };

  const outDir = join(root, "data", "build");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "guide-experience-coverage.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(`[guide-experience-coverage] Wrote ${outPath}`);
  console.log(
    `  mounts: ${total}; wowheadUrl: ${withWowheadUrl}; guide: ${withGuide} (${report.percent.withGuide}%); digest: ${withDigest} (${report.percent.withDigest}%); farmTip: ${withFarmTip} (${report.percent.withFarmTip}%)`,
  );
  console.log(
    `  rich panel (guide + digest): ${richPanel} (${report.percent.richPanelGuideAndDigest}%)`,
  );
  console.log(
    `  sample spell ids still needing guide: ${missingGuide.slice(0, 8).join(", ") || "(none)"}${missingGuide.length > 8 ? " …" : ""}`,
  );
}

main();
