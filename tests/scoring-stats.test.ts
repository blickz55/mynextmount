import { describe, expect, it } from "vitest";
import { spearmanRho } from "@/lib/scoring/stats";

describe("spearmanRho", () => {
  it("returns 1 for identical order", () => {
    const a = [1, 2, 3, 4];
    expect(spearmanRho(a, a)).toBeCloseTo(1, 5);
  });

  it("returns -1 for reversed order", () => {
    const a = [1, 2, 3, 4];
    const b = [4, 3, 2, 1];
    expect(spearmanRho(a, b)).toBeCloseTo(-1, 5);
  });

  it("handles ties", () => {
    const a = [1, 1, 3];
    const b = [1, 1, 3];
    expect(spearmanRho(a, b)).toBeCloseTo(1, 5);
  });
});
