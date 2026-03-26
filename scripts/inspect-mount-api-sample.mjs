/**
 * Inspect Blizzard mount detail JSON: top-level keys (+ optional full body).
 *
 * From API (needs BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET in .env.local):
 *   npm run data:inspect-mount-sample
 *   npm run data:inspect-mount-sample -- --id=480
 *
 * From disk cache (after `npm run data:build` or `--max=N`):
 *   npm run data:inspect-mount-sample -- --from-cache
 *   npm run data:inspect-mount-sample -- --from-cache --id=480
 *
 * List cached mount ids:
 *   npm run data:inspect-mount-sample -- --list-cache
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  apiHostForRegion,
  fetchWithRetry,
  getAccessToken,
} from "./lib/blizzard-mount.mjs";
import { loadProjectEnv } from "./lib/project-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const cacheDir = join(root, "data", "build", "cache", "blizzard", "mount");

function printKeys(obj) {
  if (!obj || typeof obj !== "object") {
    console.log("(not an object)");
    return;
  }
  const keys = Object.keys(obj).sort();
  console.log(`Top-level keys (${keys.length}):`);
  for (const k of keys) {
    const v = obj[k];
    const t =
      v === null
        ? "null"
        : Array.isArray(v)
          ? `array[${v.length}]`
          : typeof v;
    console.log(`  ${k}: ${t}`);
  }
}

function firstCachedMountId() {
  if (!existsSync(cacheDir)) return null;
  const files = readdirSync(cacheDir).filter((n) => n.endsWith(".json"));
  files.sort((a, b) => Number(a) - Number(b));
  for (const f of files) {
    const n = Number(f.replace(/\.json$/, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  let mountId = null;
  let fromCache = false;
  let listCache = false;
  let fullJson = false;
  for (const a of args) {
    if (a.startsWith("--id=")) mountId = Number(a.slice(5));
    if (a === "--from-cache") fromCache = true;
    if (a === "--list-cache") listCache = true;
    if (a === "--full") fullJson = true;
  }

  if (listCache) {
    if (!existsSync(cacheDir)) {
      console.error(
        `[inspect-mount] No cache dir yet: ${cacheDir}\n  Run: npm run data:build -- --max=5`,
      );
      process.exit(1);
    }
    const files = readdirSync(cacheDir).filter((n) => n.endsWith(".json"));
    files.sort((a, b) => Number(a) - Number(b));
    console.log(`Cached mount detail files: ${files.length}`);
    console.log(files.slice(0, 30).join("\n") + (files.length > 30 ? "\n…" : ""));
    process.exit(0);
  }

  if (fromCache) {
    const id = mountId ?? firstCachedMountId();
    if (id == null) {
      console.error(
        `[inspect-mount] No --id= and no JSON under ${cacheDir}\n  Run: npm run data:build -- --max=1`,
      );
      process.exit(1);
    }
    const path = join(cacheDir, `${id}.json`);
    if (!existsSync(path)) {
      console.error(`[inspect-mount] Missing file: ${path}`);
      process.exit(1);
    }
    const detail = JSON.parse(readFileSync(path, "utf8"));
    console.log(`Source: cache file mount id ${id}\n`);
    printKeys(detail);
    if (fullJson) {
      console.log("\nFull JSON:\n");
      console.log(JSON.stringify(detail, null, 2));
    }
    process.exit(0);
  }

  loadProjectEnv(root);
  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  const region = (process.env.BLIZZARD_REGION || "us").toLowerCase();
  if (!clientId || !clientSecret) {
    console.error(
      "[inspect-mount] Need BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET (e.g. .env.local), or use --from-cache.",
    );
    process.exit(1);
  }

  const id = mountId ?? 6;
  const apiHost = apiHostForRegion(region);
  const namespace = `static-${region}`;
  const token = await getAccessToken(clientId, clientSecret);
  const url = `${apiHost}/data/wow/mount/${id}?namespace=${namespace}&locale=en_US`;
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const detail = await res.json();
  console.log(`Source: GET ${url}\n`);
  printKeys(detail);
  if (fullJson) {
    console.log("\nFull JSON:\n");
    console.log(JSON.stringify(detail, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
