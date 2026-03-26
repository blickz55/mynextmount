/**
 * Epic I.7 — Client-side farm list / catalog search (`docs/export-contract.md` spell IDs).
 */

export type FarmSearchMount = {
  id: number;
  name: string;
};

/**
 * Empty query → matches all mounts (caller usually skips filtering).
 * All-digit query → exact **summon spell ID** match (`mount.id`).
 * Otherwise → case-insensitive substring on **`name`**.
 */
export function mountMatchesFarmSearchQuery(
  mount: FarmSearchMount,
  query: string,
): boolean {
  const q = query.trim();
  if (!q) return true;
  if (/^\d+$/.test(q)) {
    return mount.id === Number(q);
  }
  return mount.name.toLowerCase().includes(q.toLowerCase());
}

export function filterMountsByFarmSearchQuery<T extends FarmSearchMount>(
  list: T[],
  query: string,
): T[] {
  const q = query.trim();
  if (!q) return list;
  return list.filter((m) => mountMatchesFarmSearchQuery(m, q));
}
