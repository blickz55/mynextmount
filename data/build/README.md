# Build artifacts (harvest pipeline)

Epic **B.0** / **B.2**: intermediate files and provenance for mount data generation.

| Path | Purpose |
|------|---------|
| `harvest-manifest.json` | **Generated** per run — batch provenance (sources, time, counts). Commit after intentional baseline updates. |
| `harvest-manifest.example.json` | Template — copy shape when implementing the pipeline. |
| `mount-spells-raw.json` | **Epic B.3** — API spell snapshot from `npm run data:spell-baseline` (optional commit for diffs). |
| `cache/` | **Gitignored** HTTP response cache. |
| `cache/blizzard/mount/` | **Epic B.2 / B.3** — cached per-mount Game Data API JSON (`data:build`, `data:spell-baseline`). |
| `cache/blizzard/spell-enrich/` | **Epic B.4** — cached spell + media payload per summon spell id (`data:enrich-metadata`). |
| `metadata-enrich-report.json` | **Epic B.4** — run summary, name mismatches, failures (`npm run data:enrich-metadata`). |
| `harvest.log` | **Optional**, gitignored — append-only run log. |

Committed reference counts live in **`data/baseline/spell-baseline-ref.json`** (not under `build/`).

Do not hand-edit `harvest-manifest.json` except to fix typos; prefer regenerating from the pipeline.
