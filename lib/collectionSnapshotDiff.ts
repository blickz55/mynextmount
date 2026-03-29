/**
 * Epic K.1 — symmetric diff of two normalized spell-id sets (sorted unique positives).
 */
export function diffSpellIdSets(
  previousSorted: readonly number[],
  nextSorted: readonly number[],
): { added: number[]; removed: number[] } {
  const added: number[] = [];
  const removed: number[] = [];
  let i = 0;
  let j = 0;
  while (i < previousSorted.length && j < nextSorted.length) {
    const a = previousSorted[i]!;
    const b = nextSorted[j]!;
    if (a === b) {
      i += 1;
      j += 1;
    } else if (a < b) {
      removed.push(a);
      i += 1;
    } else {
      added.push(b);
      j += 1;
    }
  }
  while (i < previousSorted.length) {
    removed.push(previousSorted[i]!);
    i += 1;
  }
  while (j < nextSorted.length) {
    added.push(nextSorted[j]!);
    j += 1;
  }
  return { added, removed };
}
