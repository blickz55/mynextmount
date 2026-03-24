/**
 * Blizzard Game Data API — mount index + detail helpers (Tier 1).
 * Used by `data:check-coverage` and `data:build`.
 */

const DEFAULT_UA =
  "MyNextMount/0.1 (+repository; npm data scripts)";

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function spellIdFromMountDetail(detail) {
  const href = detail?.spell?.key?.href;
  if (typeof href !== "string") return null;
  const m = href.match(/\/spell\/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Numeric mount id from a Game Data mount key href. */
export function mountIdFromHref(href) {
  const m = String(href).match(/\/mount\/(\d+)/);
  return m ? m[1] : null;
}

export function apiHostForRegion(region) {
  const r = String(region || "us").toLowerCase();
  if (r === "eu") return "https://eu.api.blizzard.com";
  if (r === "kr") return "https://kr.api.blizzard.com";
  if (r === "tw") return "https://tw.api.blizzard.com";
  return "https://us.api.blizzard.com";
}

export async function getAccessToken(clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token request failed ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("No access_token in token response");
  return data.access_token;
}

/**
 * GET with User-Agent, optional delay after success, and 429/5xx exponential backoff.
 */
export async function fetchWithRetry(
  url,
  init = {},
  {
    maxRetries = 5,
    initialDelayMs = 2000,
    maxDelayMs = 60_000,
    delayAfterOkMs = 0,
  } = {},
) {
  let delay = initialDelayMs;
  const headers = new Headers(init.headers || {});
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", DEFAULT_UA);
  }
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { ...init, headers });
    if (res.ok) {
      if (delayAfterOkMs > 0) await sleep(delayAfterOkMs);
      return res;
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= maxRetries) {
      const t = await res.text();
      throw new Error(
        `HTTP ${res.status} for ${url}: ${t.slice(0, 240)}`,
      );
    }
    await sleep(delay);
    delay = Math.min(delay * 2, maxDelayMs);
  }
}

/** Collect every mount `key.href` from the paginated mount index. */
export async function fetchAllMountHrefs(apiHost, namespace, headers) {
  const mountHrefs = [];
  let indexUrl = `${apiHost}/data/wow/mount/index?namespace=${namespace}&locale=en_US`;
  while (indexUrl) {
    const res = await fetchWithRetry(indexUrl, { headers });
    const page = await res.json();
    for (const entry of page.mounts || []) {
      if (entry?.key?.href) mountHrefs.push(entry.key.href);
    }
    indexUrl = page._links?.next?.href || null;
  }
  return mountHrefs;
}

/**
 * Tier 1 — summon spell metadata for mount rows (`iconFileId`, spell display name).
 * Uses `/data/wow/spell/{id}` + linked spell media (icon `file_data_id`).
 */
export async function fetchSpellEnrichment(
  spellId,
  {
    apiHost,
    region = "us",
    headers,
    delayAfterOkMs = 0,
  },
) {
  const ns = `static-${String(region).toLowerCase()}`;
  const spellUrl = `${apiHost}/data/wow/spell/${spellId}?namespace=${ns}&locale=en_US`;
  const spellRes = await fetchWithRetry(spellUrl, { headers }, { delayAfterOkMs: 0 });
  const spell = await spellRes.json();
  let iconFileId;
  let iconUrl;
  const mediaHref = spell?.media?.key?.href;
  if (typeof mediaHref === "string") {
    const mediaRes = await fetchWithRetry(
      mediaHref,
      { headers },
      { delayAfterOkMs },
    );
    const media = await mediaRes.json();
    const icon = (media.assets || []).find((a) => a.key === "icon");
    if (icon && icon.file_data_id != null) {
      iconFileId = Number(icon.file_data_id);
    }
    if (icon && typeof icon.value === "string" && /^https?:\/\//i.test(icon.value)) {
      iconUrl = icon.value.trim();
    }
  }
  return {
    spellName: typeof spell.name === "string" ? spell.name : undefined,
    spellDescription:
      typeof spell.description === "string" ? spell.description : undefined,
    iconFileId,
    iconUrl,
  };
}
