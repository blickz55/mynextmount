/**
 * Short English phrase for time remaining until unlock (client or server).
 */
export function formatUnlockInShort(unlockAt: Date, now: Date = new Date()): string {
  const ms = unlockAt.getTime() - now.getTime();
  if (ms <= 0) return "now";
  const totalM = Math.ceil(ms / 60000);
  const d = Math.floor(totalM / (60 * 24));
  const h = Math.floor((totalM % (60 * 24)) / 60);
  const m = totalM % 60;
  if (d >= 3) return `${d}d`;
  if (d >= 1) return `${d}d ${h}h`;
  if (h >= 1) return `${h}h ${m}m`;
  if (m >= 1) return `${m} min`;
  return "under 1 min";
}
