/**
 * Epic B.7 — Dev-only: write export spell IDs missing from canonical data/mounts.json
 * into data/mounts.stubs.json (staging). Does not mutate mounts.json.
 *
 * The Next app merges mounts.json + mounts.stubs.json at load (lib/mounts.ts).
 *
 * Usage:
 *   1. Paste one line from /mountexport into fixtures/my-collection-export.txt
 *   2. npm run data:merge-stubs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applyDefaultLocation } from "./lib/location-default.mjs";
import { applyScoringHeuristics } from "./lib/scoring-heuristics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const exportPath = join(root, "fixtures", "my-collection-export.txt");
const canonicalPath = join(root, "data", "mounts.json");
const stubsPath = join(root, "data", "mounts.stubs.json");

function parseExportLine(line) {
  const trimmed = line.replace(/^\uFEFF/, "").trim();
  const m = trimmed.match(/^m:(.*)$/i);
  if (!m) {
    throw new Error('Expected a line starting with M: (e.g. from /mountexport)');
  }
  const body = m[1].trim();
  if (body === "") return [];
  const ids = [];
  for (const part of body.split(",")) {
    const t = part.trim();
    if (!/^\d+$/.test(t)) throw new Error(`Bad token: "${t}"`);
    ids.push(Number(t));
  }
  return ids;
}

const exportRaw = readFileSync(exportPath, "utf8");
const firstLine = exportRaw.split(/\r?\n/).find((l) => /^m:/i.test(l.trim()));
if (!firstLine) {
  console.error(
    `No line starting with M: in ${exportPath}\nCopy /mountexport output into that file.`,
  );
  process.exit(1);
}

const spellIds = parseExportLine(firstLine);
const canonical = JSON.parse(readFileSync(canonicalPath, "utf8"));
if (!Array.isArray(canonical)) {
  console.error("[data:merge-stubs] data/mounts.json must be a JSON array.");
  process.exit(1);
}

const canonicalIds = new Set(canonical.map((x) => x.id));
const stubRows = [];

for (const id of spellIds) {
  if (canonicalIds.has(id)) continue;
  const row = {
    id,
    name: `Mount (spell ${id})`,
    source: "Stub — replace with real data",
    location: "Unknown",
    expansion: "Unknown",
    tags: ["stub"],
    wowheadUrl: `https://www.wowhead.com/spell=${id}`,
    commentsUrl: `https://www.wowhead.com/spell=${id}#comments`,
    retailObtainable: true,
  };
  applyScoringHeuristics(row);
  applyDefaultLocation(row);
  stubRows.push(row);
}

stubRows.sort((a, b) => a.id - b.id);
writeFileSync(stubsPath, JSON.stringify(stubRows, null, 2) + "\n", "utf8");

const alreadyInCanonical = spellIds.length - stubRows.length;
console.log(
  `[data:merge-stubs] Canonical data/mounts.json: ${canonical.length} rows (unchanged).`,
);
console.log(
  `[data:merge-stubs] Wrote ${stubRows.length} stub row(s) → data/mounts.stubs.json`,
);
console.log(
  `  Export spell IDs: ${spellIds.length}; already in canonical: ${alreadyInCanonical}.`,
);
console.log(
  "  Restart dev server so Next.js reloads JSON. Production / CI use mounts.json only.",
);
