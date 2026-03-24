import { useMemo } from "react";
import { MountIcon } from "@/components/MountIcon";
import { scoreRarest } from "@/lib/scoreRarest";
import type { Mount } from "@/types/mount";

type Row = {
  spellId: number;
  mount: Mount | undefined;
  rarityPct: number;
};

function buildRows(parsedIds: number[], catalog: Mount[]): Row[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const rows: Row[] = parsedIds.map((spellId) => {
    const mount = byId.get(spellId);
    if (!mount) {
      return { spellId, mount: undefined, rarityPct: 0 };
    }
    const s = scoreRarest(mount);
    const rarityPct = Math.min(100, Math.max(0, Math.round(s * 1000) / 10));
    return { spellId, mount, rarityPct };
  });
  rows.sort((a, b) => {
    if (a.mount && !b.mount) return -1;
    if (!a.mount && b.mount) return 1;
    if (!a.mount && !b.mount) return a.spellId - b.spellId;
    const sb = scoreRarest(b.mount!);
    const sa = scoreRarest(a.mount!);
    if (sb !== sa) return sb - sa;
    return a.mount!.name.localeCompare(b.mount!.name);
  });
  return rows;
}

type Props = {
  parsedIds: number[];
  catalog: Mount[];
};

/**
 * Full export collection in a 2-column grid with site "rarest" score as a micro green bar.
 */
export function OwnedMountsCollection({ parsedIds, catalog }: Props) {
  const rows = useMemo(
    () => buildRows(parsedIds, catalog),
    [parsedIds, catalog],
  );

  const known = rows.filter((r) => r.mount).length;
  const unknown = rows.length - known;

  return (
    <div className="owned-collection">
      <p className="owned-collection__meta">
        {rows.length} mount{rows.length === 1 ? "" : "s"} in export
        {unknown > 0 ? (
          <>
            {" "}
            ({known} in this site&apos;s data, {unknown} id
            {unknown === 1 ? "" : "s"} not matched)
          </>
        ) : null}
        . Bar = rarity score (more green = rarer on our formula).
      </p>
      <div className="owned-collection__grid" role="list">
        {rows.map((r) => (
          <div key={r.spellId} className="owned-collection__row" role="listitem">
            {r.mount ? (
              <MountIcon mount={r.mount} size={28} />
            ) : (
              <span className="owned-collection__icon-spacer" aria-hidden />
            )}
            <span className="owned-collection__name" title={r.mount?.name ?? `Spell ${r.spellId}`}>
              {r.mount ? r.mount.name : `Unknown (${r.spellId})`}
            </span>
            <div
              className="rarity-bar"
              role="img"
              aria-label={
                r.mount
                  ? `Rarity score about ${r.rarityPct} percent`
                  : "No score — mount not in site data"
              }
            >
              <div
                className="rarity-bar__fill"
                style={{ width: r.mount ? `${r.rarityPct}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
