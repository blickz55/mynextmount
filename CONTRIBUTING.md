# Contributing

## Farm tips + optional LLM (Epic C.4)

- **`data/farm-tips.json`** — short **farmTip** strings merged in **`lib/mounts.ts`**.
- Optional draft helper: **`npm run farm-tip:draft`** — see **`docs/farm-tip-llm-workflow.md`** (not part of **`data:build`**). Log batches in **`data/farm-tip-provenance.json`**.

## Wowhead comment digests (Epic D.5)

Short **summarized** tips (not verbatim comments): **`data/wowhead-comment-digests.json`**. Policy and tiers: **`docs/wowhead-digests.md`**. Optional LLM draft from top-comment excerpts: **`npm run wowhead-digest:draft`**. Report: **`npm run data:wowhead-digest`**. Log batches in **`data/wowhead-digest-provenance.json`** when using the LLM path.

## Mount farm guides (Phase C)

Add or edit **`data/mount-guides.json`** using the **human-in-the-loop** workflow and quality bar in **`docs/guides.md`** (section **Harvesting workflow (Epic C.3)**).

After JSON changes:

- `npm run addon:sync-guides` — regenerates **`addons/MountFarmExport/MountFarmGuides.lua`** for the **MyNextMount** WoW addon (do not edit that file by hand).
- `npx tsc --noEmit` — sanity-check TypeScript.

## Data & harvesting (Phase B)

Blizzard API scripts, rate limits, and Tier 3 rules: **`docs/data-harvesting.md`**. Secrets: **`.env.example`**, never commit **`.env.local`**.

Spell icons when the spell API **404s**: **`npm run data:sync-spell-icons`** (Epic B.8 — DB2 CSV + listfile → **`mount-icon-overrides.json`**; see **`docs/mount-icons.md`**).

## Product rules

High-level scoring and MVP behavior: **`.cursorrules`**. **Active backlog:** **`backlog.md`**. **Completed epics (archive):** **`docs/backlog-archive.md`**.

**Pre-commercial honesty (Epic D.6):** Do not market **“complete farm data”** or imply full icon/guide/digest coverage until **`npm run data:check-surface -- --strict`** passes with the thresholds you commit to (see **`docs/data-harvesting.md`** — *Pre-commercial completeness*). Until then, treat the dataset as **in progress** and point users at documented gaps (e.g. **`data/build/surface-check-report.json`**, overrides, pilot digests).

## PRs

Keep diffs focused; note spell ids and citations for guide or data changes so reviewers can spot-check **Wowhead** (or other **`sourceUrl`**) quickly.
