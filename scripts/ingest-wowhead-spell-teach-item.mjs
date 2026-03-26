/**
 * Maintainer-only: fetch each mount's Wowhead spell page, parse the "Taught by"
 * item listview, pick the item that matches the mount name, merge into
 * data/overrides/wowhead-item-by-spell.json.
 *
 * NOT part of npm run data:build. See docs/data-harvesting.md (Tier 3 / maintainer).
 *
 * Usage:
 *   node scripts/ingest-wowhead-spell-teach-item.mjs --limit=20
 *   node scripts/ingest-wowhead-spell-teach-item.mjs --spell-id=288438 --apply
 *   node scripts/ingest-wowhead-spell-teach-item.mjs --only-missing --apply
 *
 * Flags:
 *   --apply              Write overrides file (default: dry-run, stdout only)
 *   --only-missing       Skip spells already in the override map (unless --force)
 *   --force              Re-fetch and overwrite map entries; replace cache
 *   --no-cache           Do not read/write disk cache (still use --delay-ms between requests)
 *   --limit=N            Max spells to process after filters (0 = no cap)
 *   --offset=N           Skip first N candidates (stable sort by spell id)
 *   --delay-ms=N         Pause between network requests (default 1200)
 *   --max-retries=N      Retries on HTTP 403/429/503 with backoff (default 4)
 *   --spell-id=N         Only this summon spell id
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadWowheadItemOverrideMap } from "./lib/wowhead-item-override.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const OVERRIDES_REL = join("data", "overrides", "wowhead-item-by-spell.json");
const MOUNTS_REL = join("data", "mounts.json");
const CACHE_DIR = join(root, "data", "build", "cache", "wowhead-spell-teach-item");

const UA =
  "Mozilla/5.0 (compatible; WowMountTransmogSearch/1.0 maintainer-ingest; +https://github.com)";

function parseArgs(argv) {
  let apply = false;
  let onlyMissing = false;
  let force = false;
  let noCache = false;
  let limit = 0;
  let offset = 0;
  let spellId = null;
  let delayMs = 1200;
  let maxRetries = 4;

  for (const a of argv) {
    if (a === "--apply") apply = true;
    else if (a === "--only-missing") onlyMissing = true;
    else if (a === "--force") force = true;
    else if (a === "--no-cache") noCache = true;
    else if (a.startsWith("--limit=")) limit = Math.max(0, Number(a.slice(8)) || 0);
    else if (a.startsWith("--offset=")) offset = Math.max(0, Number(a.slice(9)) || 0);
    else if (a.startsWith("--spell-id=")) spellId = Number(a.slice(11));
    else if (a.startsWith("--delay-ms=")) delayMs = Math.max(0, Number(a.slice(11)) || 1200);
    else if (a.startsWith("--max-retries="))
      maxRetries = Math.max(0, Math.min(12, Number(a.slice(14)) || 0));
  }

  return {
    apply,
    onlyMissing,
    force,
    noCache,
    limit,
    offset,
    spellId,
    delayMs,
    maxRetries,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normName(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKC");
}

/**
 * Extract JSON array for Listview `data:` after id taught-by-item.
 * String-aware bracket matching (handles ] inside strings).
 */
function extractTaughtByItemDataArray(html) {
  const re = /id\s*:\s*['"]taught-by-item['"]/;
  const m = re.exec(html);
  if (!m) return null;
  let pos = html.indexOf("data:", m.index);
  if (pos === -1) return null;
  pos = html.indexOf("[", pos);
  if (pos === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = pos; i < html.length; i++) {
    const ch = html[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (inStr) {
      if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return html.slice(pos, i + 1);
    }
  }
  return null;
}

function pickTeachItemId(items, mountName) {
  if (!Array.isArray(items) || items.length === 0) {
    return { id: null, reason: "empty", warn: false };
  }

  const target = normName(mountName);
  const withId = items.filter((it) => Number.isFinite(Number(it?.id)) && Number(it.id) > 0);
  const poolRaw = withId.filter(
    (it) => it.classs === 15 && it.subclass === 5,
  );
  const pool = poolRaw.length ? poolRaw : withId;

  const exact = pool.filter((it) => {
    const n = normName(it.name);
    const d = normName(it.displayName);
    return n === target || d === target;
  });
  if (exact.length === 1) return { id: Number(exact[0].id), reason: "exact", warn: false };
  if (exact.length > 1) {
    exact.sort((a, b) => normName(a.name).length - normName(b.name).length);
    return { id: Number(exact[0].id), reason: "exact-multi-shortest", warn: true };
  }

  const prefix = pool.filter((it) => {
    const n = normName(it.name);
    return (
      n.startsWith(target + "'") ||
      n.startsWith(target + "'s ") ||
      n.startsWith(target + " ")
    );
  });
  if (prefix.length === 1) return { id: Number(prefix[0].id), reason: "prefix", warn: false };
  if (prefix.length > 1) {
    prefix.sort((a, b) => normName(a.name).length - normName(b.name).length);
    return { id: Number(prefix[0].id), reason: "prefix-multi-shortest", warn: true };
  }

  if (target.length >= 3) {
    const contains = pool.filter((it) => normName(it.name).includes(target));
    if (contains.length === 1)
      return { id: Number(contains[0].id), reason: "contains", warn: false };
    if (contains.length > 1) {
      contains.sort((a, b) => normName(a.name).length - normName(b.name).length);
      return { id: Number(contains[0].id), reason: "contains-shortest", warn: true };
    }
  }

  if (pool.length === 1) return { id: Number(pool[0].id), reason: "single", warn: false };

  return {
    id: null,
    reason: "ambiguous",
    warn: false,
    candidates: pool.map((it) => ({ id: it.id, name: it.name })),
  };
}

async function fetchSpellHtml(spellId, { noCache, force, maxRetries }) {
  const url = `https://www.wowhead.com/spell=${spellId}`;
  if (!noCache) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const cachePath = join(CACHE_DIR, `${spellId}.html`);
    if (!force && existsSync(cachePath)) {
      return { html: readFileSync(cachePath, "utf8"), url, fromCache: true };
    }
  }

  const backoffStepsMs = [0, 12000, 35000, 70000, 140000, 240000];
  let lastErr = new Error(`fetch failed for ${url}`);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const base =
        backoffStepsMs[Math.min(attempt, backoffStepsMs.length - 1)] ?? 120000;
      await sleep(base + Math.random() * 5000);
    }
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (res.ok) {
      const html = await res.text();
      if (!noCache) {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(join(CACHE_DIR, `${spellId}.html`), html, "utf8");
      }
      return { html, url, fromCache: false };
    }
    lastErr = new Error(`HTTP ${res.status} for ${url}`);
    if (res.status !== 403 && res.status !== 429 && res.status !== 503) {
      throw lastErr;
    }
  }
  throw lastErr;
}

function sortNumericKeys(obj) {
  const out = {};
  const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
  for (const k of keys) out[k] = obj[k];
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  const mountsPath = join(root, MOUNTS_REL);
  const mounts = JSON.parse(readFileSync(mountsPath, "utf8"));
  if (!Array.isArray(mounts)) {
    console.error("mounts.json must be an array");
    process.exit(1);
  }

  let candidates = mounts
    .filter((m) => m && typeof m.id === "number" && Number.isFinite(m.id))
    .sort((a, b) => a.id - b.id);

  if (Number.isFinite(args.spellId) && args.spellId > 0) {
    candidates = candidates.filter((m) => m.id === args.spellId);
  }

  const existingMap = loadWowheadItemOverrideMap(root);

  if (args.onlyMissing && !args.force) {
    candidates = candidates.filter((m) => existingMap[String(m.id)] == null);
  }

  candidates = candidates.slice(args.offset);
  if (args.limit > 0) candidates = candidates.slice(0, args.limit);

  const stats = {
    processed: 0,
    added: 0,
    unchanged: 0,
    skippedConflict: 0,
    noTeachBlock: 0,
    parseError: 0,
    noPick: 0,
    fetchError: 0,
    warned: 0,
  };

  return (async () => {
    const merged = { ...existingMap };
    const lines = [];

    for (let i = 0; i < candidates.length; i++) {
      const m = candidates[i];
      const sid = m.id;
      const key = String(sid);

      if (args.delayMs > 0 && i > 0) await sleep(args.delayMs);

      let html;
      try {
        const r = await fetchSpellHtml(sid, {
          noCache: args.noCache,
          force: args.force,
          maxRetries: args.maxRetries,
        });
        html = r.html;
      } catch (e) {
        stats.fetchError++;
        lines.push(`ERR fetch ${sid} (${m.name}): ${e?.message || e}`);
        continue;
      }

      stats.processed++;
      const raw = extractTaughtByItemDataArray(html);
      if (!raw) {
        stats.noTeachBlock++;
        lines.push(`— ${sid}\t${m.name}\t(no taught-by-item block)`);
        continue;
      }

      let items;
      try {
        items = JSON.parse(raw);
      } catch {
        stats.parseError++;
        lines.push(`ERR parse ${sid}\t${m.name}\t(JSON.parse taught-by data)`);
        continue;
      }

      const pick = pickTeachItemId(items, m.name);
      if (pick.warn) stats.warned++;

      if (pick.id == null) {
        stats.noPick++;
        const c = pick.candidates?.length
          ? ` candidates=${JSON.stringify(pick.candidates)}`
          : "";
        lines.push(`— ${sid}\t${m.name}\t(${pick.reason})${c}`);
        continue;
      }

      const prev = merged[key];
      if (prev != null && Number(prev) === pick.id) {
        stats.unchanged++;
        lines.push(`= ${sid}\t${m.name}\titem ${pick.id} (${pick.reason})`);
        continue;
      }
      if (prev != null && Number(prev) !== pick.id && !args.force) {
        stats.skippedConflict++;
        lines.push(
          `! ${sid}\t${m.name}\tconflict map=${prev} parsed=${pick.id} (use --force)`,
        );
        continue;
      }

      merged[key] = pick.id;
      stats.added++;
      const tag = pick.warn ? ` [review:${pick.reason}]` : "";
      lines.push(`+ ${sid}\t${m.name}\t→ item ${pick.id} (${pick.reason})${tag}`);
    }

    console.log(lines.join("\n"));
    console.log("\n--- stats ---");
    console.log(JSON.stringify(stats, null, 2));

    if (args.apply) {
      const outPath = join(root, OVERRIDES_REL);
      writeFileSync(
        outPath,
        `${JSON.stringify(sortNumericKeys(merged), null, 2)}\n`,
        "utf8",
      );
      console.log(`\nWrote ${outPath}`);
    } else {
      console.log("\nDry-run: no file written. Pass --apply to update overrides.");
    }
  })();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
