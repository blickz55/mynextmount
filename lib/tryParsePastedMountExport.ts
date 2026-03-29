import type { ParseMountExportResult } from "@/lib/parseMountExport";
import { parseMountExport } from "@/lib/parseMountExport";

export type OkMountExport = Extract<ParseMountExportResult, { ok: true }>;

/**
 * Parse clipboard text that may include newlines or noise around an `M:…` export.
 * Returns null if nothing in the paste validates as a mount export.
 */
export function tryParsePastedMountExport(raw: string): OkMountExport | null {
  const strippedBom = raw.replace(/^\uFEFF/, "");
  const tryOne = (s: string): OkMountExport | null => {
    const r = parseMountExport(s.trim());
    return r.ok ? r : null;
  };

  let r = tryOne(strippedBom);
  if (r) return r;

  for (const line of strippedBom.split(/\r?\n/)) {
    r = tryOne(line);
    if (r) return r;
  }

  const idx = strippedBom.search(/\bM:\s*/i);
  if (idx >= 0) {
    const slice = strippedBom.slice(idx);
    const lineEnd = slice.search(/\r?\n/);
    const oneLine = lineEnd >= 0 ? slice.slice(0, lineEnd) : slice;
    r = tryOne(oneLine);
    if (r) return r;
  }

  const loose = strippedBom.match(/\bM:\s*\d[\d,\s]*/i);
  if (loose) {
    const compact = loose[0].replace(/\s/g, "");
    r = tryOne(compact);
    if (r) return r;
  }

  return null;
}

/**
 * When true, the tool page should not hijack paste — native behavior (main export box or any other field).
 */
export function delegatesMountPasteToNativeControl(
  target: EventTarget | null,
): boolean {
  if (!target || !(target instanceof Element)) {
    return false;
  }
  if (target.closest("#export")) {
    return true;
  }
  return Boolean(
    target.closest(
      'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable="true"], [contenteditable=""]',
    ),
  );
}
