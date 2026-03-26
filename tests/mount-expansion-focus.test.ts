import { describe, expect, it } from "vitest";
import {
  expansionFocusLabel,
  mountExpansionFocusId,
  mountMatchesExpansionFocus,
  normalizeExpansionLabel,
} from "@/lib/mountExpansionFocus";
import type { Mount } from "@/types/mount";

function m(partial: Partial<Mount> & Pick<Mount, "id" | "name">): Mount {
  return {
    source: "",
    location: "",
    dropRate: 0,
    difficulty: 0,
    timeToComplete: 0,
    lockout: "none",
    expansion: "Unknown",
    tags: [],
    ...partial,
  };
}

describe("normalizeExpansionLabel", () => {
  it("trims and lowercases", () => {
    expect(normalizeExpansionLabel("  Dragonflight  ")).toBe("dragonflight");
  });
});

describe("mountExpansionFocusId", () => {
  it("maps unknown-like strings to unknown", () => {
    expect(mountExpansionFocusId(m({ id: 1, name: "x", expansion: "" }))).toBe(
      "unknown",
    );
    expect(
      mountExpansionFocusId(m({ id: 1, name: "x", expansion: "Unknown" })),
    ).toBe("unknown");
  });

  it("matches canonical and synonym labels", () => {
    expect(
      mountExpansionFocusId(
        m({ id: 1, name: "x", expansion: "Dragonflight" }),
      ),
    ).toBe("dragonflight");
    expect(
      mountExpansionFocusId(
        m({ id: 1, name: "x", expansion: "battle for azeroth" }),
      ),
    ).toBe("bfa");
    expect(
      mountExpansionFocusId(
        m({ id: 1, name: "x", expansion: "Wrath of the Lich King" }),
      ),
    ).toBe("wrath");
  });

  it("treats unrecognized labels as unknown", () => {
    expect(
      mountExpansionFocusId(m({ id: 1, name: "x", expansion: "Future Xpack" })),
    ).toBe("unknown");
  });
});

describe("mountMatchesExpansionFocus", () => {
  it("all passes every mount", () => {
    const mount = m({ id: 1, name: "x", expansion: "Legion" });
    expect(mountMatchesExpansionFocus(mount, "all")).toBe(true);
  });

  it("filters by era id", () => {
    const mount = m({ id: 1, name: "x", expansion: "Legion" });
    expect(mountMatchesExpansionFocus(mount, "legion")).toBe(true);
    expect(mountMatchesExpansionFocus(mount, "dragonflight")).toBe(false);
  });
});

describe("expansionFocusLabel", () => {
  it("returns option label", () => {
    expect(expansionFocusLabel("legion")).toBe("Legion");
    expect(expansionFocusLabel("all")).toBe("All eras — full hunt");
  });
});
