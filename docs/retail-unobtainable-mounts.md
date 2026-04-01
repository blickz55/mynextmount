# Retail unobtainable mounts (catalog)

The site treats some summon spell rows as **not obtainable in current Retail** (`retailObtainable: false` on each mount in `data/mounts.json`). Those mounts:

- Are **omitted** from “Top mounts to farm” and other eligibility checks that use `lib/mountFarmEligibility.ts`.
- Show **unobtainable-oriented** copy where implemented (e.g. `getMountLocationLabel`, `buildRecommendationReason`, digests/guides when updated).

## Player-facing reference

**`/tool/retail-unobtainable`** lists every catalog row with `retailObtainable: false` for the current build (sorted by name). It is linked subtly from the main tool (Getting Started panel and collection progress hint) so it does not compete with the primary flow.

## Maintainer workflow

1. **Curated overrides** live under `data/overrides/`. The main file for “no longer obtainable in Retail” is **`data/overrides/retail-unobtainable.json`** (`patches[]` with `id` = summon spell id, `retailObtainable: false`, optional `asOfPatch` label).
2. Merge into the catalog:
   - **`npm run data:apply-overrides`** — applies **all** `data/overrides/*.json` patches to `data/mounts.json` (no Blizzard API).
   - **`npm run data:build`** — full Blizzard mount pipeline; it also runs `loadOverridesMap` / `applyRowOverride` for every row (same override files as above).
3. Commit updated **`data/mounts.json`** (and override JSON) so production matches local.
4. Optional: align **quick steps** in `data/wowhead-comment-digests.json` and **`data/mount-guides.json`** for the same spell ids so UI text matches unobtainable status.

The reference page reads **`mounts`** from `@/lib/mounts` (merged stubs + JSON), so **any** override source that sets `retailObtainable: false` appears automatically after rebuild/deploy—no extra allowlist on the page.

## Related code

- `lib/listRetailUnobtainableMounts.ts` — filters and sorts for the reference page.
- `lib/mountFarmEligibility.ts` — farm list gate.
- `scripts/apply-mount-overrides.mjs` — writes merged rows to `data/mounts.json`.
