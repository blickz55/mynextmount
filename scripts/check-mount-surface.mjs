/**
 * Epic D.6 — Pre-commercial surface completeness (static JSON only; no Blizzard API).
 *
 * Mirrors merge order in lib/mounts.ts so metrics match runtime.
 *
 * Usage:
 *   npm run data:check-surface
 *   npm run data:check-surface -- --strict
 *
 * Options:
 *   --strict     Exit 1 when below env thresholds (see .env.example).
 *   --top=N      List up to N spell ids missing resolvable icon (default 25 or SURFACE_TOP_MISSING).
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const STUB_NAME = /^Mount \(spell \d+\)$/;

const DIGEST_MAX_LINES = 10;

function loadJson(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), "utf8"));
}

function asMountArray(data) {
  if (Array.isArray(data)) return data;
  if (
    data !== null &&
    typeof data === "object" &&
    "default" in data &&
    Array.isArray(data.default)
  ) {
    return data.default;
  }
  return [];
}

function mergeCanonicalAndStubs() {
  const main = asMountArray(loadJson("data/mounts.json"));
  const stubList = existsSync(join(root, "data/mounts.stubs.json"))
    ? asMountArray(loadJson("data/mounts.stubs.json"))
    : [];
  const mainIds = new Set(main.map((m) => m.id));
  const extra = [];
  for (const s of stubList) {
    if (mainIds.has(s.id)) continue;
    extra.push(s);
  }
  const merged = [...main, ...extra];
  merged.sort((a, b) => a.id - b.id);
  return merged;
}

function mergeWowheadItemPage(mount, itemBySpell) {
  const fromMap = Number(itemBySpell[String(mount.id)]);
  if (Number.isFinite(fromMap) && fromMap > 0) {
    return { ...mount, wowheadItemId: fromMap };
  }
  if (
    typeof mount.wowheadItemId === "number" &&
    Number.isFinite(mount.wowheadItemId) &&
    mount.wowheadItemId > 0
  ) {
    return mount;
  }
  return mount;
}

function mergeFarmTips(mount, farmTipsData) {
  if (!/^\d+$/.test(String(mount.id))) return mount;
  const tip = farmTipsData[String(mount.id)];
  if (typeof tip !== "string" || !tip.trim()) return mount;
  return { ...mount, farmTip: tip.trim() };
}

function mergeGuide(mount, mountGuidesData) {
  const g = mountGuidesData.guides?.[String(mount.id)];
  if (!g?.overview?.trim() || !Array.isArray(g.checklist) || !g.sourceUrl?.trim()) {
    return mount;
  }
  const itemId = mount.wowheadItemId;
  const useItem =
    typeof itemId === "number" && Number.isFinite(itemId) && itemId > 0;
  const sourceUrl = useItem
    ? `https://www.wowhead.com/item=${itemId}`
    : g.sourceUrl.trim();
  const sourceLabel = useItem
    ? `Wowhead — ${mount.name} (item)`
    : (g.sourceLabel || "Source").trim();
  return {
    ...mount,
    guide: {
      overview: g.overview.trim(),
      checklist: g.checklist.map((s) => String(s)),
      sourceUrl,
      sourceLabel,
    },
  };
}

function mergeIconOverride(mount, mountIconOverrides) {
  if (mount.iconUrl?.trim()) return mount;
  const row = mountIconOverrides[String(mount.id)];
  const url = typeof row?.iconUrl === "string" ? row.iconUrl.trim() : "";
  if (!url) return mount;
  return { ...mount, iconUrl: url };
}

function mergeWowheadCommentDigest(mount, wowheadCommentDigests) {
  const row = wowheadCommentDigests[String(mount.id)];
  if (!row) return mount;
  const lines = Array.isArray(row.lines)
    ? row.lines
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, DIGEST_MAX_LINES)
    : [];
  const flavor = typeof row.flavor === "string" ? row.flavor.trim() : "";
  if (lines.length === 0 && !flavor) return mount;
  const asOf = typeof row.asOf === "string" ? row.asOf.trim() : "";
  return {
    ...mount,
    ...(lines.length ? { wowheadCommentDigest: lines } : {}),
    ...(flavor ? { wowheadMountFlavor: flavor } : {}),
    ...(asOf ? { wowheadCommentDigestAsOf: asOf } : {}),
  };
}

function isStubTag(m) {
  return Array.isArray(m.tags) && m.tags.includes("stub");
}

function isStubRow(m) {
  return isStubTag(m) || STUB_NAME.test(String(m.name || ""));
}

function isResolvableIconUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

function nonEmptyHttpUrl(field) {
  return typeof field === "string" && /^https?:\/\//i.test(field.trim());
}

function loadSurfaceExceptions() {
  const path = join(root, "data", "surface-exceptions.json");
  if (!existsSync(path)) {
    return {
      ignoreWowhead: new Set(),
      ignoreComments: new Set(),
      ignoreIcon: new Set(),
    };
  }
  const j = JSON.parse(readFileSync(path, "utf8"));
  const toNumSet = (arr) =>
    new Set(
      Array.isArray(arr) ? arr.map((x) => Number(x)).filter((n) => !Number.isNaN(n)) : [],
    );
  return {
    ignoreWowhead: toNumSet(j.ignoreWowheadUrlForSpellIds),
    ignoreComments: toNumSet(j.ignoreCommentsUrlForSpellIds),
    ignoreIcon: toNumSet(j.ignoreIconForSpellIds),
  };
}

function pct(part, whole) {
  if (whole <= 0) return 100;
  return (part / whole) * 100;
}

function main() {
  loadProjectEnv(root);

  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  let topMissing = Number(process.env.SURFACE_TOP_MISSING || 25);
  for (const a of args) {
    if (a.startsWith("--top=")) topMissing = Number(a.slice(6)) || 0;
  }

  const minIcon = Number(process.env.SURFACE_MIN_ICON_PCT ?? 95);
  const minWowhead = Number(process.env.SURFACE_MIN_WOWHEAD_PCT ?? 100);
  const minComments = Number(process.env.SURFACE_MIN_COMMENTS_PCT ?? 100);
  const minDigest = Number(process.env.SURFACE_MIN_DIGEST_PCT ?? 0);
  const minFarmTip = Number(process.env.SURFACE_MIN_FARM_TIP_PCT ?? 0);
  const minGuide = Number(process.env.SURFACE_MIN_GUIDE_PCT ?? 0);

  const farmTipsData = existsSync(join(root, "data/farm-tips.json"))
    ? loadJson("data/farm-tips.json")
    : {};
  const mountGuidesData = existsSync(join(root, "data/mount-guides.json"))
    ? loadJson("data/mount-guides.json")
    : { guides: {} };
  const mountIconOverrides = loadJson("data/mount-icon-overrides.json");
  const wowheadItemBySpell = existsSync(join(root, "data/overrides/wowhead-item-by-spell.json"))
    ? loadJson("data/overrides/wowhead-item-by-spell.json")
    : {};
  const wowheadCommentDigests = existsSync(join(root, "data/wowhead-comment-digests.json"))
    ? loadJson("data/wowhead-comment-digests.json")
    : {};

  const raw = mergeCanonicalAndStubs();
  const mounts = raw
    .map((m) => mergeWowheadItemPage(m, wowheadItemBySpell))
    .map((m) => mergeFarmTips(m, farmTipsData))
    .map((m) => mergeGuide(m, mountGuidesData))
    .map((m) => mergeIconOverride(m, mountIconOverrides))
    .map((m) => mergeWowheadCommentDigest(m, wowheadCommentDigests));

  const exceptions = loadSurfaceExceptions();

  const nameIssues = [];
  for (const m of mounts) {
    const name = String(m.name ?? "");
    if (!name.trim()) {
      nameIssues.push({ id: m.id, reason: "empty_name" });
      continue;
    }
    if (!isStubTag(m) && STUB_NAME.test(name)) {
      nameIssues.push({ id: m.id, reason: "stub_name_without_stub_tag" });
    }
  }

  const baseline = mounts.filter((m) => !isStubRow(m));
  const stubRows = mounts.length - baseline.length;

  let iconOk = 0;
  let wowOk = 0;
  let commentsOk = 0;
  let digestOk = 0;
  let farmTipOk = 0;
  let guideOk = 0;

  const missingIcon = [];

  for (const m of baseline) {
    const id = m.id;
    const passIcon =
      exceptions.ignoreIcon.has(id) || isResolvableIconUrl(m.iconUrl);
    if (passIcon) iconOk++;
    else missingIcon.push({ id, name: m.name });

    if (exceptions.ignoreWowhead.has(id) || nonEmptyHttpUrl(m.wowheadUrl)) wowOk++;
    if (exceptions.ignoreComments.has(id) || nonEmptyHttpUrl(m.commentsUrl)) commentsOk++;

    const hasDigestLines =
      Array.isArray(m.wowheadCommentDigest) && m.wowheadCommentDigest.length > 0;
    const hasFlavor =
      typeof m.wowheadMountFlavor === "string" && m.wowheadMountFlavor.trim();
    if (hasDigestLines || hasFlavor) {
      digestOk++;
    }
    if (typeof m.farmTip === "string" && m.farmTip.trim()) farmTipOk++;
    if (m.guide?.overview) guideOk++;
  }

  missingIcon.sort((a, b) => a.id - b.id);

  const n = baseline.length;
  const iconPct = pct(iconOk, n);
  const wowPct = pct(wowOk, n);
  const commentsPct = pct(commentsOk, n);
  const digestPct = pct(digestOk, n);
  const farmTipPct = pct(farmTipOk, n);
  const guidePct = pct(guideOk, n);

  const topList = missingIcon.slice(0, topMissing);

  console.log("[check-mount-surface] Dataset (after stub merge + farm tips / guides / icons / digests)");
  console.log(`  Total merged rows: ${mounts.length}`);
  console.log(`  Non-stub rows (surface denominator): ${n}`);
  console.log(`  Stub / dev-placeholder rows (excluded from %): ${stubRows}`);
  if (nameIssues.length) {
    console.log(`  Name quality issues: ${nameIssues.length} (empty name or "Mount (spell N)" without stub tag)`);
  }

  console.log("\n[check-mount-surface] Coverage % (non-stub rows)");
  console.log(
    `  Resolvable icon URL (row or mount-icon-overrides, or icon exception): ${iconPct.toFixed(2)}% (${iconOk}/${n})  [strict ≥ ${minIcon}%]`,
  );
  console.log(
    `  wowheadUrl: ${wowPct.toFixed(2)}% (${wowOk}/${n})  [strict ≥ ${minWowhead}%]`,
  );
  console.log(
    `  commentsUrl: ${commentsPct.toFixed(2)}% (${commentsOk}/${n})  [strict ≥ ${minComments}%]`,
  );
  console.log(
    `  wowheadCommentDigest (merged): ${digestPct.toFixed(2)}% (${digestOk}/${n})  [strict ≥ ${minDigest}% if set > 0]`,
  );
  console.log(`  farmTip (optional): ${farmTipPct.toFixed(2)}% (${farmTipOk}/${n})  [strict ≥ ${minFarmTip}% if set > 0]`);
  console.log(`  guide (optional): ${guidePct.toFixed(2)}% (${guideOk}/${n})  [strict ≥ ${minGuide}% if set > 0]`);

  if (topList.length && missingIcon.length) {
    console.log(
      `\n[check-mount-surface] Top ${topList.length} spell ids missing resolvable icon (of ${missingIcon.length} total gaps)`,
    );
    for (const row of topList) {
      console.log(`  ${row.id}\t${row.name}`);
    }
  } else if (n && missingIcon.length === 0) {
    console.log("\n[check-mount-surface] No icon gaps in non-stub rows.");
  }

  const failures = [];
  if (nameIssues.length) failures.push({ check: "name_quality", count: nameIssues.length, detail: nameIssues.slice(0, 20) });
  if (strict) {
    if (iconPct + 1e-9 < minIcon) failures.push({ check: "icon_pct", actual: iconPct, min: minIcon });
    if (wowPct + 1e-9 < minWowhead) failures.push({ check: "wowhead_pct", actual: wowPct, min: minWowhead });
    if (commentsPct + 1e-9 < minComments) failures.push({ check: "comments_pct", actual: commentsPct, min: minComments });
    if (minDigest > 0 && digestPct + 1e-9 < minDigest) {
      failures.push({ check: "digest_pct", actual: digestPct, min: minDigest });
    }
    if (minFarmTip > 0 && farmTipPct + 1e-9 < minFarmTip) {
      failures.push({ check: "farm_tip_pct", actual: farmTipPct, min: minFarmTip });
    }
    if (minGuide > 0 && guidePct + 1e-9 < minGuide) {
      failures.push({ check: "guide_pct", actual: guidePct, min: minGuide });
    }
  }

  const reportPath = join(root, "data", "build", "surface-check-report.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        strict,
        thresholds: {
          minIcon,
          minWowhead,
          minComments,
          minDigest,
          minFarmTip,
          minGuide,
        },
        totals: {
          mergedRows: mounts.length,
          nonStubRows: n,
          stubRows,
          nameIssueCount: nameIssues.length,
        },
        metrics: {
          icon: { ok: iconOk, missing: n - iconOk, pct: iconPct },
          wowheadUrl: { ok: wowOk, missing: n - wowOk, pct: wowPct },
          commentsUrl: { ok: commentsOk, missing: n - commentsOk, pct: commentsPct },
          digest: { ok: digestOk, missing: n - digestOk, pct: digestPct },
          farmTip: { ok: farmTipOk, missing: n - farmTipOk, pct: farmTipPct },
          guide: { ok: guideOk, missing: n - guideOk, pct: guidePct },
        },
        topMissingIconSpellIds: topList,
        missingIconCount: missingIcon.length,
        strictPassed: failures.length === 0,
        failures,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`\n[check-mount-surface] Report → ${reportPath}`);

  if (strict && failures.length) {
    console.error("\n[check-mount-surface] STRICT FAIL");
    for (const f of failures) {
      console.error(`  ${f.check}:`, f.count != null ? f.count : `${f.actual} < ${f.min}`);
    }
    process.exit(1);
  }

  console.log(
    strict
      ? "\n[check-mount-surface] STRICT OK"
      : "\n[check-mount-surface] OK (informational; use --strict for gate)",
  );
  process.exit(0);
}

main();
