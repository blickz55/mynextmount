/** Game Data may return plain strings or localized `{ en_US: "…" }` objects. */
export function pickDisplayString(v) {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.en_US != null) return String(v.en_US);
  if (typeof v === "object") {
    const s = Object.values(v).find((x) => typeof x === "string");
    if (s) return s;
  }
  return undefined;
}
