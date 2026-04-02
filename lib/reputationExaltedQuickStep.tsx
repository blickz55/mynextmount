import type { ReactNode } from "react";

import reputationFarmData from "@/data/overrides/wowhead-reputation-farm-url.json";

const BY_KEY = reputationFarmData.byKey as Record<string, string>;

/** Single-word false positives before "Exalted" (e.g. "At Exalted, …"). */
const PRE_EXALTED_FALSE_NAMES = new Set([
  "at",
  "an",
  "no",
  "or",
  "be",
  "to",
  "on",
  "once",
  "until",
  "reach",
  "get",
  "earn",
  "buy",
  "repeat",
  "complete",
  "finish",
  "requires",
  "need",
]);

/** Lowercase, trim, collapse spaces, strip apostrophes for map lookup. */
export function normalizeReputationLookupKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function reputationFarmUrlForDisplayName(name: string): string | null {
  const cleaned = name.trim().replace(/[.,;:]+$/g, "");
  const k = normalizeReputationLookupKey(cleaned);
  if (!k) return null;
  if (/^your\s+pandaren\b/i.test(cleaned)) return null;
  return BY_KEY[k] ?? null;
}

/**
 * Parses reputation display names from the substring after "… Exalted with ".
 * Handles "the ", dual "A or B", and tails like ", unless …", " if …".
 * Does not treat " or Exalted with …" as a second faction pair.
 */
export function parseRequiresExaltedReputationNames(rest: string): string[] {
  const trimmed = rest.trim();
  if (!trimmed) return [];

  const first = trimmed.match(
    /^(?:the\s+)?(.+?)(?=\s*[.;]|,|\s+or\s|\s+if\s|\s+unless\s|$)/i,
  );
  if (!first) return [];

  const names: string[] = [first[1].trim()];
  let tail = trimmed.slice(first[0].length);
  const orM = tail.match(/^\s+or\s+/i);
  if (orM) {
    const afterOr = tail.slice(orM[0].length).trimStart();
    if (/^exalted\s+with\s+/i.test(afterOr)) {
      // e.g. "… or Exalted with Exodar" — stop after first faction.
    } else {
      tail = tail.slice(orM[0].length);
      const second = tail.match(
        /^(.+?)(?=\s*[.;]|,|\s+or\s|\s+if\s|\s+unless\s|$)/i,
      );
      if (second) {
        const s = second[1].trim();
        const looksLikeRaceOrGate =
          /\b(character|race)\b/i.test(s) || /^being\b/i.test(s);
        if (!looksLikeRaceOrGate) names.push(s);
      }
    }
  }

  return names.filter(Boolean);
}

function renderExaltedReputationTailWithConsumed(
  after: string,
  names: string[],
  keyBase: number,
): { node: ReactNode; consumed: number } {
  const out: ReactNode[] = [];
  let cursor = 0;
  const work = after;

  const theM = work.match(/^(the\s+)/i);
  if (theM) {
    out.push(theM[1]);
    cursor = theM[0].length;
  }

  for (let ni = 0; ni < names.length; ni++) {
    const name = names[ni];
    const rest = work.slice(cursor);
    const idx = rest.toLowerCase().indexOf(name.toLowerCase());
    if (idx < 0) {
      out.push(rest);
      return { node: <>{out}</>, consumed: after.length };
    }
    if (idx > 0) out.push(rest.slice(0, idx));
    const actual = rest.slice(idx, idx + name.length);
    const url = reputationFarmUrlForDisplayName(name);
    if (url) {
      out.push(
        <a
          key={`exalted-rep-${keyBase}-${ni}-${cursor + idx}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {actual}
        </a>,
      );
    } else {
      out.push(actual);
    }
    cursor += idx + name.length;

    if (ni < names.length - 1) {
      const tail = work.slice(cursor);
      const between = tail.match(/^(\s*or\s*)/i);
      if (between) {
        out.push(between[1]);
        cursor += between[1].length;
      }
    }
  }

  if (cursor < work.length) out.push(work.slice(cursor));
  return { node: <>{out}</>, consumed: after.length };
}

type Hit = { s: number; e: number; node: ReactNode };

function mergeNonOverlappingHits(hits: Hit[]): Hit[] {
  const sorted = [...hits].sort((a, b) => a.s - b.s || b.e - a.e - (b.s - a.s));
  const out: Hit[] = [];
  for (const h of sorted) {
    if (out.some((x) => !(h.e <= x.s || h.s >= x.e))) continue;
    out.push(h);
  }
  out.sort((a, b) => a.s - b.s);
  return out;
}

/**
 * Link reputations for lines that contain "Exalted" outside the main
 * "exalted with …" loop (e.g. "Exodar Exalted", "Exalted Stormwind.").
 */
function renderOtherExaltedPatterns(input: string): ReactNode {
  if (!/\bexalted\b/i.test(input)) return input;

  const hits: Hit[] = [];
  let k = 0;

  const rNeed =
    /\b(requires|need)\s+exalted\s+(?!with\b)([^,]+?)(?=(,|\s+unless|\s+if\s|$))/gi;
  for (const m of input.matchAll(rNeed)) {
    const name = m[2]!.trim();
    if (name.length < 2 || /\bexalted\s+with\b/i.test(name)) continue;
    const url = reputationFarmUrlForDisplayName(name);
    const node = (
      <>
        {m[1]} exalted{" "}
        {url ? (
          <a
            key={`exo-${k++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {name}
          </a>
        ) : (
          name
        )}
      </>
    );
    hits.push({ s: m.index!, e: m.index! + m[0].length, node });
  }

  const rEw =
    /\bexalted\s+((?!with\b)(?:the\s+)?(?:[A-Z][a-z]+(?:'[a-z]+)?)(?:\s+[A-Z][a-z]+){0,4})(?=\s*[.,;]|\s+unless|\s+reputation\b|\s+on\b|\s+required|$)/g;
  for (const m of input.matchAll(rEw)) {
    const name = (m[1] ?? "").trim();
    if (!name) continue;
    const url = reputationFarmUrlForDisplayName(name);
    const node = (
      <>
        Exalted{" "}
        {url ? (
          <a
            key={`exo-${k++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {name}
          </a>
        ) : (
          name
        )}
      </>
    );
    hits.push({ s: m.index!, e: m.index! + m[0].length, node });
  }

  const rFe =
    /\b((?:The\s+)?[A-Z][A-Za-z'\s-]{2,50}?)\s+(Exalted)\b(?!\s+with)/gi;
  for (const m of input.matchAll(rFe)) {
    const name = m[1]!.trim();
    const firstTok = name.split(/\s+/)[0]!.toLowerCase();
    if (PRE_EXALTED_FALSE_NAMES.has(firstTok)) continue;
    if (normalizeReputationLookupKey(name) === "at") continue;
    const url = reputationFarmUrlForDisplayName(name);
    const node = (
      <>
        {url ? (
          <a
            key={`exo-${k++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {name}
          </a>
        ) : (
          name
        )}{" "}
        {m[2]}
      </>
    );
    hits.push({ s: m.index!, e: m.index! + m[0].length, node });
  }

  if (hits.length === 0) return input;

  const merged = mergeNonOverlappingHits(hits);
  const out: ReactNode[] = [];
  let pos = 0;
  for (const h of merged) {
    if (pos < h.s) out.push(input.slice(pos, h.s));
    out.push(h.node);
    pos = h.e;
  }
  if (pos < input.length) out.push(input.slice(pos));
  return <>{out}</>;
}

/**
 * When a quick-step line mentions Exalted (with a reputation), link names to
 * curated Wowhead farming / faction pages.
 */
export function renderQuickStepLineWithExaltedLinks(line: string): ReactNode {
  if (!/\bexalted\b/i.test(line)) {
    return line;
  }

  const chunks: ReactNode[] = [];
  let remaining = line;
  let iter = 0;
  let guard = 0;

  while (remaining.length > 0 && guard++ < 32) {
    const idx = remaining.search(/exalted\s+with\s+/i);
    if (idx < 0) {
      chunks.push(renderOtherExaltedPatterns(remaining));
      break;
    }
    if (idx > 0) {
      chunks.push(renderOtherExaltedPatterns(remaining.slice(0, idx)));
    }

    const fromIdx = remaining.slice(idx);
    const mm = fromIdx.match(/^(exalted\s+with\s+)([\s\S]*)$/i);
    if (!mm) {
      chunks.push(fromIdx);
      break;
    }

    const mid = mm[1]!;
    const after = mm[2] ?? "";
    const names = parseRequiresExaltedReputationNames(after);

    if (names.length === 0) {
      chunks.push(mid);
      remaining = after;
      continue;
    }

    const { node, consumed } = renderExaltedReputationTailWithConsumed(
      after,
      names,
      iter,
    );
    chunks.push(mid, node);
    remaining = after.slice(consumed);
    iter += 1;
  }

  return <>{chunks}</>;
}
