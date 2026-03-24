export type ParseMountExportResult =
  | { ok: true; ids: number[] }
  | { ok: false; error: string };

/**
 * Validates and parses `M:12,45,78` → numeric spell IDs (see docs/export-contract.md).
 * Rejects missing `M:` prefix and non-numeric / empty ID tokens.
 */
export function parseMountExport(exportString: string): ParseMountExportResult {
  const trimmed = exportString.replace(/^\uFEFF/, "").trim();
  if (!/^m:/i.test(trimmed)) {
    return {
      ok: false,
      error:
        'Export must start with M: followed by comma-separated mount IDs (e.g. M:12,45,78).',
    };
  }

  const body = trimmed.slice(2).trim();
  if (body === "") {
    return { ok: true, ids: [] };
  }

  const parts = body.split(",");
  const ids: number[] = [];

  for (const part of parts) {
    const token = part.trim();
    if (token === "") {
      return {
        ok: false,
        error: "Empty mount ID — remove extra commas or fill in every ID.",
      };
    }
    if (!/^\d+$/.test(token)) {
      return {
        ok: false,
        error: `Invalid mount ID "${token}". Use whole numbers only (e.g. 12, 45, 78).`,
      };
    }
    ids.push(Number(token));
  }

  return { ok: true, ids };
}
