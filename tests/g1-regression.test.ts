import { describe, expect, it } from "vitest";
import catalogJson from "../fixtures/g1-mount-catalog.json";
import { filterUnownedMounts } from "@/lib/filterUnownedMounts";
import { parseMountExport } from "@/lib/parseMountExport";
import { scoreEasiest } from "@/lib/scoreEasiest";
import { scoreRarest } from "@/lib/scoreRarest";
import { sortMountsByScore } from "@/lib/selectTopMountsByScore";
import type { Mount } from "@/types/mount";

const catalog = catalogJson as Mount[];

/** Export string that owns 100001 and 100002; remaining fixture mounts are unowned. */
const G1_EXPORT_OWNED_FIRST_TWO = "M:100001,100002";

describe("parseMountExport (G.1)", () => {
  it("accepts valid M: prefix and comma-separated IDs", () => {
    const r = parseMountExport("M:12,45,78");
    expect(r).toEqual({ ok: true, ids: [12, 45, 78] });
  });

  it("accepts lowercase m:", () => {
    const r = parseMountExport("m:1,2");
    expect(r).toEqual({ ok: true, ids: [1, 2] });
  });

  it("accepts empty ID list after prefix", () => {
    const r = parseMountExport("M:");
    expect(r).toEqual({ ok: true, ids: [] });
  });

  it("strips BOM and whitespace", () => {
    const r = parseMountExport("\uFEFF  M:1,2  \n");
    expect(r).toEqual({ ok: true, ids: [1, 2] });
  });

  it("rejects missing M: prefix", () => {
    const r = parseMountExport("12,45");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/start with M:/i);
  });

  it("rejects empty token between commas", () => {
    const r = parseMountExport("M:1,,2");
    expect(r.ok).toBe(false);
  });

  it("rejects non-numeric token", () => {
    const r = parseMountExport("M:1,abc");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Invalid mount ID/i);
  });
});

describe("filterUnownedMounts — ownership invariant (G.1)", () => {
  it("never returns a mount whose id is in ownedIds", () => {
    const parsed = parseMountExport(G1_EXPORT_OWNED_FIRST_TWO);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const owned = new Set(parsed.ids);
    const unowned = filterUnownedMounts(catalog, parsed.ids);
    for (const m of unowned) {
      expect(owned.has(m.id)).toBe(false);
    }
  });

  it("excludes exactly the owned spell IDs from the fixture catalog", () => {
    const parsed = parseMountExport(G1_EXPORT_OWNED_FIRST_TWO);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const unowned = filterUnownedMounts(catalog, parsed.ids);
    const ids = unowned.map((m) => m.id).sort((a, b) => a - b);
    expect(ids).toEqual([100003, 100004, 100005, 100006]);
  });
});

describe("scoring determinism (G.1)", () => {
  it("scoreEasiest returns the same value for repeated calls", () => {
    const m = catalog[2]!;
    const scores = Array.from({ length: 50 }, () => scoreEasiest(m));
    expect(new Set(scores).size).toBe(1);
  });

  it("scoreRarest returns the same value for repeated calls", () => {
    const m = catalog[1]!;
    const scores = Array.from({ length: 50 }, () => scoreRarest(m));
    expect(new Set(scores).size).toBe(1);
  });
});

describe("sortMountsByScore — ordering + slice head (G.1)", () => {
  it("orders unowned fixture mounts by easiest (full sort matches expected head)", () => {
    const parsed = parseMountExport(G1_EXPORT_OWNED_FIRST_TWO);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const unowned = filterUnownedMounts(catalog, parsed.ids);
    const sorted = sortMountsByScore(unowned, scoreEasiest);
    expect(sorted.map((m) => m.id)).toEqual([100004, 100003, 100005, 100006]);
    expect(sorted.slice(0, 3).map((m) => m.id)).toEqual([
      100004, 100003, 100005,
    ]);
  });

  it("orders unowned fixture mounts by rarest (full sort matches expected head)", () => {
    const parsed = parseMountExport(G1_EXPORT_OWNED_FIRST_TWO);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const unowned = filterUnownedMounts(catalog, parsed.ids);
    const sorted = sortMountsByScore(unowned, scoreRarest);
    expect(sorted.map((m) => m.id)).toEqual([100006, 100004, 100003, 100005]);
    expect(sorted.slice(0, 3).map((m) => m.id)).toEqual([
      100006, 100004, 100003,
    ]);
  });

  it("repeated sorts yield identical id order (stable regression signal)", () => {
    const parsed = parseMountExport(G1_EXPORT_OWNED_FIRST_TWO);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const unowned = filterUnownedMounts(catalog, parsed.ids);
    const run = () =>
      sortMountsByScore(unowned, scoreEasiest)
        .map((m) => m.id)
        .join(",");
    const first = run();
    for (let i = 0; i < 20; i++) expect(run()).toBe(first);
  });
});
