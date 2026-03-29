import { describe, expect, it } from "vitest";
import { probabilityAtLeastOneDropSeenPercent } from "@/lib/probabilityAtLeastOneDrop";

describe("probabilityAtLeastOneDropSeenPercent", () => {
  it("returns null when attempts < 1", () => {
    expect(probabilityAtLeastOneDropSeenPercent(0.5, 0)).toBeNull();
    expect(probabilityAtLeastOneDropSeenPercent(0.5, -1)).toBeNull();
  });

  it("returns null when drop rate is non-positive or non-finite", () => {
    expect(probabilityAtLeastOneDropSeenPercent(0, 10)).toBeNull();
    expect(probabilityAtLeastOneDropSeenPercent(-0.1, 10)).toBeNull();
    expect(probabilityAtLeastOneDropSeenPercent(NaN, 10)).toBeNull();
  });

  it("computes 1 - (1-p)^n as rounded percent", () => {
    // p=0.5, n=1 -> 50%
    expect(probabilityAtLeastOneDropSeenPercent(0.5, 1)).toBe(50);
    // p=0.5, n=2 -> 75%
    expect(probabilityAtLeastOneDropSeenPercent(0.5, 2)).toBe(75);
    // p=1, n=3 -> 100%
    expect(probabilityAtLeastOneDropSeenPercent(1, 3)).toBe(100);
  });

  it("clamps drop rate to [0, 1]", () => {
    expect(probabilityAtLeastOneDropSeenPercent(2, 1)).toBe(100);
  });
});
