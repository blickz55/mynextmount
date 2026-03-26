/**
 * Spearman rank correlation ρ in [-1, 1]. Ties get average ranks.
 * For empty or single-element input, returns NaN.
 */
export function spearmanRho(scoresA: number[], scoresB: number[]): number {
  const n = scoresA.length;
  if (n !== scoresB.length || n < 2) return Number.NaN;

  const rankWithTies = (values: number[]): number[] => {
    const sorted = values
      .map((v, i) => ({ v, i }))
      .sort((x, y) => x.v - y.v);
    const ranks = new Array<number>(n);
    let j = 0;
    while (j < n) {
      let k = j;
      while (k + 1 < n && sorted[k + 1]!.v === sorted[j]!.v) k++;
      const avg = (j + k + 2) / 2;
      for (let t = j; t <= k; t++) ranks[sorted[t]!.i] = avg;
      j = k + 1;
    }
    return ranks;
  };

  const ra = rankWithTies(scoresA);
  const rb = rankWithTies(scoresB);
  const meanA = ra.reduce((s, x) => s + x, 0) / n;
  const meanB = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = ra[i]! - meanA;
    const xb = rb[i]! - meanB;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? Number.NaN : num / den;
}
