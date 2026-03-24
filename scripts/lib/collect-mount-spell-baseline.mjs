/**
 * Walk Retail mount index + details; return summon spell IDs and per-mount rows.
 * Shares on-disk cache with `data:build` (`data/build/cache/blizzard/mount/`).
 */

import {
  apiHostForRegion,
  fetchAllMountHrefs,
  fetchWithRetry,
  getAccessToken,
  mountIdFromHref,
} from "./blizzard-mount.mjs";
import { pickDisplayString } from "./api-display-string.mjs";
import {
  loadMountToSpellMap,
  summonSpellIdForMount,
} from "./mount-spell-map.mjs";
import {
  mountDetailCachePath,
  readMountDetailCache,
  writeMountDetailCache,
} from "./mount-detail-cache.mjs";

/** Progress on stderr so npm / Windows doesn’t block-buffer stdout for minutes. */
function logProgress(msg) {
  process.stderr.write(`${msg}\n`);
}

/**
 * @returns {{ artifact: object, failures: Array<{ href: string, reason: string }> }}
 */
export async function collectMountSpellBaseline({
  root,
  clientId,
  clientSecret,
  region = "us",
  delayMs = 1000,
  cacheTtlSec = 86400,
  forceRefresh = false,
  maxMounts = Infinity,
}) {
  const mountToSpell = loadMountToSpellMap(root);
  if (!mountToSpell) {
    return {
      artifact: {},
      failures: [
        {
          href: "(project root)",
          reason:
            "missing data/baseline/mount-to-summon-spell.json — run npm run data:ingest-mount-map",
        },
      ],
    };
  }

  const apiHost = apiHostForRegion(region);
  const namespace = `static-${region}`;
  const token = await getAccessToken(clientId, clientSecret);
  const headers = { Authorization: `Bearer ${token}` };

  const mountHrefs = await fetchAllMountHrefs(apiHost, namespace, headers);
  const mountIndexEntryCount = mountHrefs.length;
  logProgress(
    `  Index entries: ${mountIndexEntryCount}. Loading mount details (cached rows are fast; uncached ~${delayMs}ms after each API response). Progress every 10 OK rows → stderr.`,
  );

  const entries = [];
  const spellToMountIds = new Map();
  const failures = [];
  let detailsLoaded = 0;

  for (const href of mountHrefs) {
    if (detailsLoaded >= maxMounts) break;

    const mountNumericId = mountIdFromHref(href);
    if (!mountNumericId) {
      failures.push({ href, reason: "could not parse mount id from href" });
      continue;
    }

    const cpath = mountDetailCachePath(root, mountNumericId);
    let detail = readMountDetailCache(cpath, cacheTtlSec, forceRefresh);

    try {
      if (!detail) {
        const res = await fetchWithRetry(
          href,
          { headers },
          { delayAfterOkMs: delayMs },
        );
        detail = await res.json();
        writeMountDetailCache(cpath, detail);
      }
    } catch (e) {
      failures.push({ href, reason: e.message || String(e) });
      continue;
    }

    const spellId = summonSpellIdForMount(
      detail,
      mountNumericId,
      mountToSpell,
    );
    if (spellId == null) {
      failures.push({
        href,
        reason: `no summon spell id for mount ${mountNumericId} (API + Mount.db2 map)`,
      });
      continue;
    }

    detailsLoaded += 1;

    const name =
      pickDisplayString(detail.name) || `Mount (spell ${spellId})`;

    entries.push({
      mountId: mountNumericId,
      spellId,
      name,
    });

    if (!spellToMountIds.has(spellId)) {
      spellToMountIds.set(spellId, []);
    }
    spellToMountIds.get(spellId).push(mountNumericId);

    const cap = Math.min(mountIndexEntryCount, maxMounts);
    if (detailsLoaded === 1 || detailsLoaded % 10 === 0) {
      logProgress(`  …details ${detailsLoaded}/${cap} OK`);
    }
  }

  const duplicateSpells = [];
  for (const [spellId, mountIds] of spellToMountIds) {
    if (mountIds.length > 1) {
      duplicateSpells.push({ spellId, mountIds });
    }
  }
  duplicateSpells.sort((a, b) => a.spellId - b.spellId);

  const uniqueSummonSpellIds = [...spellToMountIds.keys()].sort(
    (a, b) => a - b,
  );

  const generatedAt = new Date().toISOString();
  const artifact = {
    schemaVersion: 1,
    generatedAt,
    namespace,
    region,
    mountIndexEntryCount,
    detailSuccessCount: entries.length,
    uniqueSummonSpellCount: uniqueSummonSpellIds.length,
    duplicateSpellCount: duplicateSpells.length,
    duplicateSpells,
    uniqueSummonSpellIds,
    entries: entries.sort(
      (a, b) => Number(a.mountId) - Number(b.mountId),
    ),
  };

  return { artifact, failures };
}
