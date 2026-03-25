"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MountIcon } from "@/components/MountIcon";
import { scoreRarest } from "@/lib/scoreRarest";
import type { Mount } from "@/types/mount";

/** Below this count, render a flat grid (virtualizer overhead not worth it). */
export const OWNED_MOUNTS_VIRTUALIZE_MIN = 48;

const ROW_ESTIMATE_PX = 44;

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

function OwnedMountRow({ row: r }: { row: Row }) {
  return (
    <div className="owned-collection__row" role="listitem">
      {r.mount ? (
        <MountIcon mount={r.mount} size={28} />
      ) : (
        <span className="owned-collection__icon-spacer" aria-hidden />
      )}
      <div
        className="owned-collection__name-stack"
        title={r.mount?.name ?? `Spell ${r.spellId}`}
      >
        <span className="owned-collection__name-text">
          {r.mount ? r.mount.name : `Unknown (${r.spellId})`}
        </span>
        {r.mount?.retailObtainable === false ? (
          <span className="owned-collection__badge-unobtainable">
            No longer obtainable
          </span>
        ) : null}
      </div>
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
  );
}

function OwnedMountsGridVirtual({ rows }: { rows: Row[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const sync = () => setCols(el.clientWidth <= 600 ? 1 : 2);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowCount = Math.ceil(rows.length / cols);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 12,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      className="owned-collection__viewport"
      role="list"
      aria-label="Owned mounts (virtualized list)"
    >
      <div
        className="owned-collection__virtual-sizer"
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualRows.map((vRow) => {
          const startIdx = vRow.index * cols;
          const slice = rows.slice(startIdx, startIdx + cols);
          return (
            <div
              key={vRow.key}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              className="owned-collection__virtual-strip"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              <div
                className="owned-collection__grid owned-collection__grid--virtual"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    cols === 2 ? "1fr 1fr" : "1fr",
                  gap: "0.3rem 1rem",
                  alignItems: "center",
                }}
              >
                {slice.map((r) => (
                  <OwnedMountRow key={r.spellId} row={r} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  parsedIds: number[];
  catalog: Mount[];
};

/**
 * Full export collection in a 2-column grid with site "rarest" score as a micro green bar.
 * Large exports use windowed rendering inside a scroll viewport (Epic G.2).
 */
export function OwnedMountsCollection({ parsedIds, catalog }: Props) {
  const rows = useMemo(
    () => buildRows(parsedIds, catalog),
    [parsedIds, catalog],
  );

  const known = rows.filter((r) => r.mount).length;
  const unknown = rows.length - known;
  const useVirtual = rows.length >= OWNED_MOUNTS_VIRTUALIZE_MIN;

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
        {useVirtual ? (
          <>
            {" "}
            Large list: scrollable window for {rows.length} mounts (faster UI).
          </>
        ) : null}
      </p>
      {useVirtual ? (
        <OwnedMountsGridVirtual rows={rows} />
      ) : (
        <div className="owned-collection__viewport owned-collection__viewport--auto">
          <div className="owned-collection__grid" role="list">
            {rows.map((r) => (
              <OwnedMountRow key={r.spellId} row={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
