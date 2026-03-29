"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MountIcon } from "@/components/MountIcon";
import {
  OwnedMountsLoreProvider,
  useOwnedMountLoreRow,
  type OwnedMountLoreHoverPayload,
} from "@/components/MountLoreRelicTooltip";
import { loreThemeWithRotation } from "@/lib/mountLoreTheme";
import { scoreRarest } from "@/lib/scoreRarest";
import { LIST_VIRTUALIZE_MIN } from "@/lib/virtualizeThresholds";
import type { Mount } from "@/types/mount";

/** Re-export for docs/tests; prefer `LIST_VIRTUALIZE_MIN` from `lib/virtualizeThresholds`. */
export const OWNED_MOUNTS_VIRTUALIZE_MIN = LIST_VIRTUALIZE_MIN;

const ROW_ESTIMATE_PX = 44;

type Row = {
  spellId: number;
  mount: Mount | undefined;
  rarityPct: number;
};

function wowheadUrlForOwnedRow(r: Row): string {
  const fromMount = r.mount?.wowheadUrl?.trim();
  if (fromMount) return fromMount;
  const spellId = r.mount?.id ?? r.spellId;
  if (Number.isFinite(spellId) && spellId > 0) {
    return `https://www.wowhead.com/spell=${spellId}`;
  }
  return "";
}

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
  const lore = useOwnedMountLoreRow();
  const lorePayload = useMemo((): OwnedMountLoreHoverPayload | null => {
    if (!r.mount) {
      return {
        spellId: r.spellId,
        mountName: `Unknown (${r.spellId})`,
        expansion: "Unknown",
        theme: loreThemeWithRotation(
          {
            name: "",
            source: "",
            location: "",
            tags: [],
            expansion: "Unknown",
          },
          r.spellId,
        ),
      };
    }
    return {
      spellId: r.spellId,
      mountName: r.mount.name,
      expansion: r.mount.expansion,
      source: r.mount.source,
      location: r.mount.location,
      tags: r.mount.tags,
      theme: loreThemeWithRotation(r.mount, r.spellId),
      prebakedLore: r.mount.mountHoverLore?.trim(),
      flavorFallback: r.mount.wowheadMountFlavor?.trim(),
    };
  }, [r]);

  const lorePointer =
    lore && lorePayload
      ? {
          onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
            lore.onRowEnter(lorePayload);
            lore.onRowMove(e.clientX, e.clientY);
          },
          onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
            lore.onRowMove(e.clientX, e.clientY);
          },
          onPointerLeave: () => lore.onRowLeave(),
        }
      : {};

  const href = wowheadUrlForOwnedRow(r);
  const label = r.mount?.name ?? `Unknown (${r.spellId})`;
  const inner = (
    <>
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
    </>
  );
  if (href) {
    return (
      <a
        className="owned-collection__row owned-collection__row--link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        role="listitem"
        aria-label={`${label} on Wowhead (opens in new tab)`}
        {...lorePointer}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className="owned-collection__row" role="listitem" {...lorePointer}>
      {inner}
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
function OwnedMountsCollectionInner({ parsedIds, catalog }: Props) {
  const rows = useMemo(
    () => buildRows(parsedIds, catalog),
    [parsedIds, catalog],
  );

  const known = rows.filter((r) => r.mount).length;
  const unknown = rows.length - known;
  const useVirtual = rows.length >= LIST_VIRTUALIZE_MIN;

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
        ) : null}{" "}
        Hover for Archivist lore from{" "}
        <code className="inline-code">data/mount-hover-lore.json</code> (batch:
        npm run content:mount-hover-lore-batch).
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

export function OwnedMountsCollection(props: Props) {
  return (
    <OwnedMountsLoreProvider>
      <OwnedMountsCollectionInner {...props} />
    </OwnedMountsLoreProvider>
  );
}
