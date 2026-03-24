/**
 * Epic B.3 — Retail mount summon spell ID baseline vs committed reference.
 *
 * Writes `data/build/mount-spells-raw.json` (full API-aligned snapshot).
 * Compares counts to `data/baseline/spell-baseline-ref.json` unless --update-ref.
 *
 * Usage:
 *   npm run data:spell-baseline
 *   npm run data:spell-baseline -- --update-ref
 *   npm run data:spell-baseline -- --max=20
 *   npm run data:spell-baseline -- --force-refresh
 *
 * Env: same Blizzard + cache/delay vars as `data:build` (see docs/data-harvesting.md).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProjectEnv } from "./lib/project-env.mjs";
import { collectMountSpellBaseline } from "./lib/collect-mount-spell-baseline.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const REF_PATH = join(root, "data", "baseline", "spell-baseline-ref.json");
const RAW_OUT = join(root, "data", "build", "mount-spells-raw.json");

async function main() {
  const args = process.argv.slice(2);
  let maxMounts = Infinity;
  let forceRefresh = false;
  let updateRef = false;
  for (const a of args) {
    if (a.startsWith("--max=")) {
      maxMounts = Number(a.slice(6)) || 0;
    } else if (a === "--force-refresh") {
      forceRefresh = true;
    } else if (a === "--update-ref") {
      updateRef = true;
    }
  }

  loadProjectEnv(root);

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = (process.env.BLIZZARD_REGION || "us").toLowerCase();
  const delayMs = Number(
    process.env.SPELL_BASELINE_FETCH_DELAY_MS ||
      process.env.BUILD_FETCH_DELAY_MS ||
      1000,
  );
  const cacheTtlSec = Number(
    process.env.SPELL_BASELINE_CACHE_TTL_SECONDS ||
      process.env.BUILD_CACHE_TTL_SECONDS ||
      86400,
  );

  if (!clientId || !clientSecret) {
    console.error(
      "[data:spell-baseline] Missing BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET.",
    );
    console.error("  Set them in .env.local (see .env.example).\n");
    process.exit(1);
  }

  process.stderr.write(
    `[data:spell-baseline] Collecting mount → spell linkage (${region})…\n`,
  );

  const { artifact, failures } = await collectMountSpellBaseline({
    root,
    clientId,
    clientSecret,
    region,
    delayMs,
    cacheTtlSec,
    forceRefresh,
    maxMounts,
  });

  if (failures.length) {
    console.error(
      `\n[data:spell-baseline] FAIL — ${failures.length} mount detail error(s):`,
    );
    for (const f of failures.slice(0, 15)) {
      console.error(`  ${f.reason}\n    ${f.href}`);
    }
    if (failures.length > 15) {
      console.error(`  …and ${failures.length - 15} more`);
    }
    console.error("");
    process.exit(1);
  }

  mkdirSync(dirname(RAW_OUT), { recursive: true });
  writeFileSync(RAW_OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  console.log(`\n[data:spell-baseline] Wrote ${RAW_OUT}`);

  if (maxMounts < artifact.mountIndexEntryCount) {
    console.warn(
      `\n  NOTE: --max=${maxMounts} — snapshot incomplete; skip ref compare & --update-ref.`,
    );
    process.exit(0);
  }

  if (updateRef) {
    mkdirSync(dirname(REF_PATH), { recursive: true });
    const ref = {
      schemaVersion: 1,
      updatedAt: artifact.generatedAt,
      expectedMountIndexEntries: artifact.mountIndexEntryCount,
      toleranceMountIndex: 0,
      expectedUniqueSpellCount:
        artifact.duplicateSpellCount > 0
          ? artifact.uniqueSummonSpellCount
          : artifact.mountIndexEntryCount,
      toleranceUnique: 0,
      notes:
        "Committed gate for npm run data:spell-baseline. Re-run with --update-ref after verified Retail API changes. Set expectedUniqueSpellCount to null to enforce index count only.",
    };
    writeFileSync(REF_PATH, JSON.stringify(ref, null, 2) + "\n", "utf8");
    console.log(`  Updated reference → ${REF_PATH}`);
    console.log(
      `    expectedMountIndexEntries=${ref.expectedMountIndexEntries}, expectedUniqueSpellCount=${ref.expectedUniqueSpellCount}\n`,
    );
    process.exit(0);
  }

  if (!existsSync(REF_PATH)) {
    console.error(
      "\n[data:spell-baseline] FAIL — missing data/baseline/spell-baseline-ref.json",
    );
    console.error(
      "  Run once with --update-ref after verifying output, then commit the ref file.\n",
    );
    process.exit(1);
  }

  const ref = JSON.parse(readFileSync(REF_PATH, "utf8"));
  const tolIdx = Number(ref.toleranceMountIndex ?? 0);
  const tolUniq = Number(ref.toleranceUnique ?? 0);
  const expIdx = Number(ref.expectedMountIndexEntries);
  const expUniqRaw = ref.expectedUniqueSpellCount;
  const checkUniq =
    expUniqRaw != null && Number.isFinite(Number(expUniqRaw));
  const expUniq = checkUniq ? Number(expUniqRaw) : null;

  const dIdx = Math.abs(artifact.mountIndexEntryCount - expIdx);
  const dUniq = checkUniq
    ? Math.abs(artifact.uniqueSummonSpellCount - expUniq)
    : 0;

  console.log("\n[data:spell-baseline] Compare to reference");
  console.log(
    `  mountIndexEntryCount: API ${artifact.mountIndexEntryCount} vs ref ${expIdx} (Δ ${artifact.mountIndexEntryCount - expIdx}, tol ±${tolIdx})`,
  );
  if (checkUniq) {
    console.log(
      `  uniqueSummonSpellCount: API ${artifact.uniqueSummonSpellCount} vs ref ${expUniq} (Δ ${artifact.uniqueSummonSpellCount - expUniq}, tol ±${tolUniq})`,
    );
  } else {
    console.log(
      `  uniqueSummonSpellCount: API ${artifact.uniqueSummonSpellCount} (ref not set — index-only gate)`,
    );
  }
  if (artifact.duplicateSpellCount) {
    console.log(
      `  duplicate spell rows (multiple journal mounts → same summon spell): ${artifact.duplicateSpellCount}`,
    );
  }

  const badIdx = dIdx > tolIdx;
  const badUniq = checkUniq && dUniq > tolUniq;
  if (badIdx || badUniq) {
    console.error(
      "\n[data:spell-baseline] FAIL — counts outside tolerance vs spell-baseline-ref.json",
    );
    console.error(
      "  If Retail added/removed mounts, run: npm run data:spell-baseline -- --update-ref",
    );
    console.error(
      "  Then commit data/baseline/spell-baseline-ref.json (and usually mount-spells-raw.json).\n",
    );
    process.exit(1);
  }

  console.log(
    "\n[data:spell-baseline] OK — counts match reference within tolerance.\n",
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("[data:spell-baseline] ERROR", e.message || e);
  process.exit(2);
});
