import { mounts } from "@/lib/mounts";

let cached: Map<number, string> | null = null;

function spellIdToNameMap(): Map<number, string> {
  if (!cached) {
    cached = new Map(mounts.map((m) => [m.id, m.name]));
  }
  return cached;
}

export function mountNamesForSpellIds(ids: readonly number[]): string[] {
  const map = spellIdToNameMap();
  return ids.map((id) => map.get(id) ?? `Unknown (${id})`);
}

export function spellIdsWithNames(ids: readonly number[]): {
  spellId: number;
  name: string;
}[] {
  const map = spellIdToNameMap();
  return ids.map((spellId) => ({
    spellId,
    name: map.get(spellId) ?? `Unknown (${spellId})`,
  }));
}
