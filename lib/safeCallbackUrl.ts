/** Allow only same-origin relative paths (open-redirect safe). */
export function safeAppCallbackPath(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (raw === undefined || raw === null) return fallback;
  const t = String(raw).trim();
  if (!t.startsWith("/")) return fallback;
  if (t.startsWith("//")) return fallback;
  if (t.includes("\\")) return fallback;
  return t;
}
