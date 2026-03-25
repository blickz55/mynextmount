/**
 * Fetch Wowhead comment bodies as JSON (best-effort; URL shape varies by Wowhead front-end).
 * Operator may set WOWHEAD_COMMENTS_URL_TEMPLATE or WOWHEAD_COOKIE — see docs/wowhead-digests.md.
 */

const DEFAULT_URL_TEMPLATES = [
  "https://www.wowhead.com/data/comments?type={objectType}&id={objectId}",
  "https://www.wowhead.com/data/comments?id={objectId}&type={objectType}",
  "https://www.wowhead.com/data/comments?objectType={objectType}&objectId={objectId}",
];

function stripWowheadishMarkup(raw) {
  let s = String(raw);
  s = s.replace(/\[\/?[a-z]+(?:=[^\]]*)?\]/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function decodeBasicEntities(s) {
  return String(s)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const c = Number(n);
      return Number.isFinite(c) ? String.fromCharCode(c) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function collectCommentCandidates(obj, out, depth = 0) {
  if (depth > 30 || obj === null || obj === undefined) return;
  if (typeof obj === "string") return;
  if (Array.isArray(obj)) {
    for (const x of obj) collectCommentCandidates(x, out, depth + 1);
    return;
  }
  if (typeof obj === "object") {
    const score = Number(
      obj.rating ?? obj.score ?? obj.upvotes ?? obj.up ?? obj.votes ?? 0,
    );
    const raw =
      obj.body ??
      obj.comment ??
      obj.message ??
      obj.bodyText ??
      obj.text ??
      obj.content;
    if (typeof raw === "string") {
      const cleaned = stripWowheadishMarkup(decodeBasicEntities(raw));
      if (cleaned.length >= 20 && cleaned.length < 8000) {
        out.push({ text: cleaned, score: Number.isFinite(score) ? score : 0 });
      }
    }
    for (const k of Object.keys(obj)) {
      collectCommentCandidates(obj[k], out, depth + 1);
    }
  }
}

/**
 * @param {unknown} json
 * @param {number} max
 * @returns {{ texts: string[], debugTopKeys: string[] }}
 */
export function pickTopCommentTexts(json, max) {
  const candidates = [];
  collectCommentCandidates(json, candidates);
  const byText = new Map();
  for (const c of candidates) {
    const prev = byText.get(c.text);
    if (!prev || c.score > prev) byText.set(c.text, c.score);
  }
  const unique = [...byText.entries()]
    .map(([text, score]) => ({ text, score }))
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length);
  const texts = unique.slice(0, max).map((x) => x.text);
  const debugTopKeys =
    json && typeof json === "object" && !Array.isArray(json)
      ? Object.keys(json).slice(0, 12)
      : [];
  return { texts, debugTopKeys };
}

export function resolveWowheadCommentTarget(mount, env) {
  const url = typeof mount.wowheadUrl === "string" ? mount.wowheadUrl.trim() : "";
  const spellType = Number(env.WOWHEAD_COMMENT_OBJECT_TYPE_SPELL || 6);
  const itemType = Number(env.WOWHEAD_COMMENT_OBJECT_TYPE_ITEM || 3);
  let m = url.match(/wowhead\.com\/spell=(\d+)/i);
  if (m) {
    return { objectType: spellType, objectId: Number(m[1]), pageKind: "spell" };
  }
  m = url.match(/wowhead\.com\/item=(\d+)/i);
  if (m) {
    return { objectType: itemType, objectId: Number(m[1]), pageKind: "item" };
  }
  return {
    objectType: spellType,
    objectId: mount.id,
    pageKind: "spell-fallback",
  };
}

function expandTemplate(template, objectType, objectId) {
  return template
    .replaceAll("{objectType}", String(objectType))
    .replaceAll("{objectId}", String(objectId));
}

/**
 * @param {object} opts
 * @param {number} opts.objectType
 * @param {number} opts.objectId
 * @param {string} opts.userAgent
 * @param {string} [opts.cookie]
 * @param {number} opts.maxComments
 * @param {string[]} [opts.urlTemplates]
 */
export async function fetchWowheadCommentTexts(opts) {
  const {
    objectType,
    objectId,
    userAgent,
    cookie,
    maxComments,
    urlTemplates,
  } = opts;
  const templates =
    urlTemplates && urlTemplates.length > 0
      ? urlTemplates
      : DEFAULT_URL_TEMPLATES;
  const headers = {
    "User-Agent": userAgent,
    Accept: "application/json, text/json;q=0.9, */*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (cookie && cookie.trim()) headers.Cookie = cookie.trim();

  const errors = [];
  for (const t of templates) {
    const url = expandTemplate(t, objectType, objectId);
    try {
      const res = await fetch(url, { headers, redirect: "follow" });
      const text = await res.text();
      if (!res.ok) {
        errors.push(`${url} → HTTP ${res.status}`);
        continue;
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        errors.push(`${url} → non-JSON body (${text.slice(0, 80)}…)`);
        continue;
      }
      const { texts, debugTopKeys } = pickTopCommentTexts(json, maxComments);
      if (texts.length > 0) {
        return { texts, urlUsed: url, debugTopKeys };
      }
      errors.push(
        `${url} → JSON parsed but 0 comment bodies (top keys: ${debugTopKeys.join(", ") || "n/a"})`,
      );
    } catch (e) {
      errors.push(`${url} → ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(
    `Could not load Wowhead comments for type=${objectType} id=${objectId}. Try WOWHEAD_COMMENTS_URL_TEMPLATE from DevTools Network tab, and/or WOWHEAD_COOKIE from your browser session.\n${errors.map((x) => `  - ${x}`).join("\n")}`,
  );
}
