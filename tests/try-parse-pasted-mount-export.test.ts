import { describe, expect, it } from "vitest";

import { tryParsePastedMountExport } from "@/lib/tryParsePastedMountExport";

describe("tryParsePastedMountExport", () => {
  it("parses export after leading line noise", () => {
    const r = tryParsePastedMountExport("copied from addon\nM:1,2,3");
    expect(r?.ok).toBe(true);
    if (r?.ok) expect(r.ids).toEqual([1, 2, 3]);
  });

  it("parses embedded M: line", () => {
    const r = tryParsePastedMountExport("foo M:9,10 bar");
    expect(r?.ok).toBe(true);
    if (r?.ok) expect(r.ids).toEqual([9, 10]);
  });

  it("returns null for non-export", () => {
    expect(tryParsePastedMountExport("just some text")).toBeNull();
  });
});
