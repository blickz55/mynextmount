/** Serialize spell IDs for `User.collectionSpellIds` (comma-separated, no `M:`). */
export function serializeSpellIds(ids: readonly number[]): string {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const n of ids) {
    const x = Number(n);
    if (!Number.isFinite(x) || x <= 0 || x > 2 ** 31 - 1) continue;
    const r = Math.floor(x);
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  out.sort((a, b) => a - b);
  return out.join(",");
}

export function deserializeSpellIds(raw: string): number[] {
  const s = raw.trim();
  if (!s) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const part of s.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const x = Number(t);
    if (!Number.isFinite(x) || x <= 0) continue;
    const r = Math.floor(x);
    if (seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  out.sort((a, b) => a - b);
  return out;
}

export const MAX_SAVED_SPELL_IDS = 12_000;
