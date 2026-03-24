import {
  fetchAllMountHrefs,
  fetchWithRetry,
  mountIdFromHref,
} from "./blizzard-mount.mjs";
import {
  mountDetailCachePath,
  readMountDetailCache,
  writeMountDetailCache,
} from "./mount-detail-cache.mjs";
import { summonSpellIdForMount } from "./mount-spell-map.mjs";

/**
 * Walk mount index + details; collect unique summon spell IDs (same contract as data:build).
 *
 * @param {object} opts
 * @param {string} opts.root - Project root (required when useCache)
 * @param {string} opts.apiHost
 * @param {string} opts.namespace
 * @param {Record<string, string>} opts.headers - Authorization, etc.
 * @param {Map<string, number>|null} opts.mountToSpell
 * @param {number} [opts.maxMounts]
 * @param {number} [opts.delayMs]
 * @param {boolean} [opts.useCache] - Read/write data/build/cache/blizzard/mount/
 * @param {number} [opts.cacheTtlSec]
 * @param {boolean} [opts.forceRefresh]
 * @param {(msg: string) => void} [opts.log]
 */
export async function collectApiMountSpellIds({
  root,
  apiHost,
  namespace,
  headers,
  mountToSpell,
  maxMounts = Infinity,
  delayMs = 1000,
  useCache = false,
  cacheTtlSec = 86400,
  forceRefresh = false,
  log = () => {},
}) {
  const mountHrefs = await fetchAllMountHrefs(apiHost, namespace, headers);
  const apiSpellIds = new Set();
  let detailsFetched = 0;
  let failures = 0;
  let cacheHits = 0;

  for (const href of mountHrefs) {
    if (detailsFetched >= maxMounts) break;

    const mountNumericId = mountIdFromHref(href);
    if (!mountNumericId) {
      failures += 1;
      continue;
    }

    let detail = null;
    const cpath =
      useCache && root ? mountDetailCachePath(root, mountNumericId) : null;

    if (cpath) {
      detail = readMountDetailCache(cpath, cacheTtlSec, forceRefresh);
      if (detail) cacheHits += 1;
    }

    try {
      if (!detail) {
        const res = await fetchWithRetry(
          href,
          { headers },
          { delayAfterOkMs: delayMs },
        );
        detail = await res.json();
        if (cpath) writeMountDetailCache(cpath, detail);
      }

      const sid = summonSpellIdForMount(
        detail,
        mountNumericId,
        mountToSpell,
      );
      if (sid != null) apiSpellIds.add(sid);
      detailsFetched += 1;

      if (detailsFetched % 50 === 0) {
        log(
          `  …mount details ${detailsFetched}/${Math.min(mountHrefs.length, maxMounts)}`,
        );
      }
    } catch (e) {
      failures += 1;
      log(`  WARN detail ${href}: ${e.message || e}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return {
    mountHrefs,
    apiSpellIds,
    detailsFetched,
    failures,
    cacheHits,
  };
}
