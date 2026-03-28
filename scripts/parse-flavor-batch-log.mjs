/**
 * Extract spell ids from mount-flavor-batch terminal output (FAIL lines).
 *
 *   node scripts/parse-flavor-batch-log.mjs path/to/terminal.txt
 *
 * Prints unique ids (sorted) and a suggested npm retry command.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "data", "build");
const outListPath = join(outDir, "mount-flavor-failed-spell-ids.txt");

const logPath = process.argv[2];
if (!logPath) {
  console.error(
    "Usage: node scripts/parse-flavor-batch-log.mjs <terminal-log.txt>",
  );
  process.exit(2);
}

const text = readFileSync(logPath, "utf8");
const re = /^\s*FAIL\s+(\d+)\s*:/gm;
const ids = new Set();
let m;
while ((m = re.exec(text)) !== null) {
  ids.add(Number(m[1]));
}
const sorted = [...ids].sort((a, b) => a - b);

console.log(`Found ${sorted.length} unique spell id(s) with FAIL.\n`);
console.log(sorted.join(","));

mkdirSync(outDir, { recursive: true });
writeFileSync(outListPath, sorted.join("\n") + "\n", "utf8");
console.log(`\nWrote ${outListPath}`);

const spellIdsArg = sorted.join(",");
console.log("\nSuggested retry (use the file — do not shorten with `...`):\n");
console.log(
  "npm run content:mount-flavor-batch -- --spell-ids-file=data/build/mount-flavor-failed-spell-ids.txt --flavor-force --apply",
);
console.log("\nOr full inline list (very long):\n");
console.log(
  `npm run content:mount-flavor-batch -- --spell-ids=${spellIdsArg} --flavor-force --apply`,
);
